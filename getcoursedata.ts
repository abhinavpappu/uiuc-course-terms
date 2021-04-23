import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

export type Course = {
  subject: string;
  number: number;
  name: string;
  counts: [fall: number, spring: number, summer: number, winter: number];
  allTerms: string[];
};

main();

async function main() {
  const courses = await getCourses('CS');
  console.log(`Num courses: ${courses.length}`);
  await fs.promises.writeFile('./coursedata.json', JSON.stringify(courses, null, 2));
}

async function getCourses(subject: string): Promise<Course[]> {
  // const URL = `http://catalog.illinois.edu/courses-of-instruction/${subject.toLowerCase()}/`;
  const URL = `https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/${subject}.xml`;
  const xml = await (await fetch(URL)).text();
  const $ = cheerio.load(xml);

  const coursePromises = $('course').get().map(async element => ({
    subject,
    number: Number($(element).attr('id')) || 0,
    name: $(element).text() || 'Unknown',
    ...await getTermData($(element).attr('href'))
  }));

  return Promise.all(coursePromises);
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
      console.log(`Unknown term: ${term}`);
    }
  })

  return termData;
}