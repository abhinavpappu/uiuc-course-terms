import cheerio, { load } from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { confirm } from 'promptly';
import humanizeDuration from 'humanize-duration';

export type Course = {
  subject: string;
  number: number;
  name: string;
  counts: [fall: number, spring: number, summer: number, winter: number];
  allTerms: string[];
};

export type CourseData = {
  lastUpdated: string; // formatted like "Fall 2021"
  courses: Course[];
};

export type Subject = {
  name: string; // e.g. "CS"
  link: string; // URL formatted like `https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/${subjectName}.xml`
};

main().catch(err => {
  console.error('Failed to fetch data.');
  throw err;
});

async function main() {
  const shouldContinue = await confirm("Warning: This will send thousands of http requests (one for every course at UIUC, plus a couple more). Are you sure you want to continue (y/n)?");
  if (shouldContinue) {
    const totalStartTime = Date.now();
    let totalNumCourses = 0;
    const subjects = await getSubjects();
    await fs.promises.writeFile(path.resolve(__dirname, `./data/subjects.json`), JSON.stringify(subjects.map(s => s.name)));
    console.log(`Retrieved ${subjects.length} subjects, written to data/subjects.json"`);

    // we could process all subjects simultaneously, but that may be too many requests at once,
    // so we do them one at a time instead
    // (note that `getCourseData` creates a bunch of simultaneous requests for each course in a subject)
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const startTime = Date.now();
      try {
        const courseData = await getCourseData(subject);
        await fs.promises.writeFile(path.resolve(__dirname, `./data/${subject.name}.json`), JSON.stringify(courseData));
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
  }
}

async function loadURL(url: string): Promise<cheerio.Root> {
  const xml = await (await fetch(url)).text();
  return cheerio.load(xml);
}

// returns a list of urls to each subject page 
async function getSubjects(): Promise<Subject[]> {
  let $ = await loadURL('https://courses.illinois.edu/cisapp/explorer/catalog.xml');
  const yearUrl = $('calendarYear').first().attr('href'); // TODO: currently assuming first `calendarYear` is latest
  console.log(`Using the following year URL: ${yearUrl}`);

  $ = await loadURL(yearUrl as string);
  const termUrl = $('term').last().attr('href'); // TODO: currently assuming last `term` is latest
  console.log(`Using the following term URL: ${termUrl}`);

  $ = await loadURL(termUrl as string);

  return $('subject').get().map(element => ({
    // we assume the following attributes exist
    name: $(element).attr('id') as string,
    link: $(element).attr('href') as string,
  }));
}

async function getCourseData(subject: Subject): Promise<CourseData> {
  const $ = await loadURL(subject.link);

  const currentTerm = $('parents > term').text();

  const coursePromises = $('course').get().map(async element => ({
    subject: subject.name,
    number: Number($(element).attr('id')) || 0,
    name: $(element).text() || 'Unknown',
    ...await getTermData($(element).attr('href'))
  }));

  return {
    lastUpdated: currentTerm,
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
