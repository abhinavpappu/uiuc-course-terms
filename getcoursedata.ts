import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

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
}

main();

async function main() {
  const subject = 'CS'; // temporarily hardcoded
  try {
    const courseData = await getCourseData(subject);
    console.log(`Last Updated: ${courseData.lastUpdated}`);
    console.log(`Num courses: ${courseData.courses.length}`);
    await fs.promises.writeFile(path.resolve(__dirname, './data/coursedata.json'), JSON.stringify(courseData, null, 2));
  } catch (e) {
    console.error(`Failed to fetch data for subject "${subject}"`);
    console.error(e);
  }
}

async function getCourseData(subject: string): Promise<CourseData> {
  const URL = `https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/${subject}.xml`;
  const xml = await (await fetch(URL)).text();
  const $ = cheerio.load(xml);

  const currentTerm = $('parents > term').text();

  const coursePromises = $('course').get().map(async element => ({
    subject,
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