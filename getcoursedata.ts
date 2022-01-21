import type { Element } from 'domhandler';
import cheerio, { load } from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { confirm } from 'promptly';
import humanizeDuration from 'humanize-duration';

const CATALOG_URL = 'https://courses.illinois.edu/cisapp/explorer/catalog.xml';
const lastUpdatedFile = path.resolve(__dirname, './data/lastupdated.txt');
const subjectsFile = path.resolve(__dirname, `./data/subjects.json`);

export type Course = {
  subject: string;
  number: number;
  name: string;
  counts: [fall: number, spring: number, summer: number, winter: number];
  allTerms: string[];
};

export type CourseData = {
  courses: Course[];
};

export type Subject = {
  name: string; // e.g. "CS"
  link: string; // URL formatted like `https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/${subjectName}.xml`
};

// undefined also indicates `false`
export type Flags = {
  yes?: boolean; // skips the first confirmation prompt
}

const flags: Flags = {};

const getSubjectFile = (subject: Subject) => path.resolve(__dirname, `./data/subjects/${subject.name}.json`);

main().catch(err => {
  console.error('Failed to fetch data.');
  throw err;
});

async function main() {
  processFlags(process.argv);

  const shouldContinue = flags.yes || await confirm("Warning: This will send thousands of http requests (one for every course at UIUC, plus a couple more). Are you sure you want to continue (y/n)?");
  if (shouldContinue) {
    const totalStartTime = Date.now();
    let totalNumCourses = 0;
    const subjects = await getSubjects();
    if (subjects.length >= 1) { // if `subjects` is [], then we don't want to do anything
      // TODO: maybe merge the subjects instead of overwriting? (in case any subjects were removed)
      await fs.promises.writeFile(subjectsFile, JSON.stringify(subjects.map(s => s.name)));
      console.log(`Retrieved ${subjects.length} subjects, written to data/subjects.json"`);
    }

    // we could process all subjects simultaneously, but that may be too many requests at once,
    // so we do them one at a time instead
    // (note that `getCourseData` still creates a bunch of simultaneous requests for each course in a subject)
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const startTime = Date.now();
      try {
        const courseData = await getCourseData(subject);
        await fs.promises.writeFile(getSubjectFile(subject), JSON.stringify(courseData));
        totalNumCourses += courseData.courses.length;
        const timeTaken = Date.now() - startTime;
        console.log(`[${i+1}/${subjects.length}] ${subject.name} completed in ${humanizeDuration(timeTaken)}, ${courseData.courses.length} courses processed`);
      } catch(err) {
        console.error(`Failed to fetch data for subject "${subject.name}"`);
        console.error(err);
      }
    }

    const totalTimeTaken = Date.now() - totalStartTime;
    console.log(`Done! ${totalNumCourses} total courses processed in ${humanizeDuration(totalTimeTaken)}`);

    const now = Date.now();
    fs.promises.writeFile(lastUpdatedFile, now.toString());
    console.log(`Wrote current epoch time "${now}" to data/lastupdated.txt`);
  }
}

function processFlags(args: string[]) {
  if (args.includes('-y')) {
    flags.yes = true;
  }
}

async function loadURL(url: string): Promise<cheerio.Root> {
  const xml = await (await fetch(url)).text();
  return cheerio.load(xml);
}

// returns a list of urls to each subject page 
async function getSubjects(): Promise<Subject[]> {
  let $ = await loadURL(CATALOG_URL);
  // TODO: currently assuming first `calendarYear` is latest
  const latestYearUrl = await getFirstWorkingUrl($('calendarYear').toArray().map(year => year.attribs.href));
  if (!latestYearUrl) {
    console.log('Error fetching latest year url');
    return [];
  }
  console.log(`Using the following year URL: ${latestYearUrl}`);

  $ = await loadURL(latestYearUrl as string);
  // TODO: currently assuming last `term` is latest (so we reverse below list)
  const latestTermUrl = await getFirstWorkingUrl($('term').toArray().reverse().map(term => term.attribs.href));
  if (!latestTermUrl) {
    console.log('Error fetching latest term URL');
    return [];
  }
  console.log(`Using the following term URL: ${latestTermUrl}`);

  $ = await loadURL(latestTermUrl as string);

  return $('subject').get().map(element => ({
    // we assume the following attributes exist
    name: $(element).attr('id') as string,
    link: $(element).attr('href') as string,
  }));
}

async function getFirstWorkingUrl(urls: string[]): Promise<string | null> {
  // Sometimes the listed urls aren't actually valid, so we iterate through the list of urls and check if the url actually exists
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        return url;
      }
    } catch(err) {}
  }
  return null;
}

async function getCourseData(subject: Subject): Promise<CourseData> {
  const $ = await loadURL(subject.link);

  const coursePromises = $('course').get().map(async element => ({
    subject: subject.name,
    number: Number($(element).attr('id')) || 0,
    name: $(element).text() || 'Unknown',
    ...await getTermData($(element).attr('href'))
  }));

  return {
    courses: await Promise.all(coursePromises),
  };
}

type TermData = Pick<Course, "counts" | "allTerms">;

// courseLink should be a URL like "https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/CS/100.xml"
async function getTermData(courseLink?: string): Promise<TermData> {
  const termData: TermData = {
    counts: [0, 0, 0, 0],
    allTerms: [],
  }

  if (!courseLink) return termData;

  let $: cheerio.Root;
  try {
    const xml = await (await fetch(courseLink)).text();
    $ = cheerio.load(xml);
  } catch(e) {
    return termData;
  }
  
  $('course').each((i, element) => {
    const term = $(element).text();
    termData.allTerms.push(term);
    if (term.includes('Fall')) {
      termData.counts[0] += 1;
    } else if (term.includes('Spring')) {
      termData.counts[1] += 1;
    } else if (term.includes('Summer')) {
      termData.counts[2] += 1;
    } else if (term.includes('Winter')) {
      termData.counts[3] += 1;
    } else {
      console.log(`Unknown term: "${term}", skipping...`);
    }
  })

  return termData;
}
