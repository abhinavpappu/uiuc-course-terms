# uiuc-course-terms

Displays most recent offerings of each course at UIUC and which terms they were offered.

### Usage
Go [here](https://uiuc-course-terms.netlify.app/), select the subject you want, and look for long strips of orange/blue indicating fall/spring-only courses.
Adjust the number of terms visible if desired.

### Why
So I wanted a way to see which courses at UIUC were fall-only and spring-only, and got all the necessary data from the course explorer api
(from urls like [this](https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/CS/100.xml)) and was going to just generate
a list of fall-only/spring-only courses. But turns out there are a lot of exceptions (where a fall course was offered during spring but only once)
and courses that switched from fall-only to spring-only or vice versa, plus other weird stuff that I didn't feel like dealing with.
So I decided to just display all the data instead, allowing the viewer to determine for themselves.

## Development
I wanted to try out using [Svelte](https://svelte.dev/) and [esbuild](https://esbuild.github.io/) for the first time, so I'm probably not following any
of the best practices, but here's how it's set up:

### Fetching Data
(You should almost never need to run this since the data is already committed to the github repository, and ideally should be automatically updated
when next semester's courses are released)
```bash
npm run fetchdata
```
will run `ts-node getcoursedata.ts`, which will do the following (the urls below are hardcoded with specific values as examples):
1. sends a request to https://courses.illinois.edu/cisapp/explorer/catalog.xml to get the latest year
2. sends a request to https://courses.illinois.edu/cisapp/explorer/catalog/2021.xml to get the latest term
3. sends a request to https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall.xml to get a list of subjects
4. saves the list of subjects to `data/subjects.json` (will be used later by the frontend)
5. for each subject:
    1. sends a request to https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/CS.xml to get all courses in subject
    2. simultaneously sends a request to each of those courses (formatted like https://courses.illinois.edu/cisapp/explorer/catalog/2021/fall/CS/100.xml)
        - for each course it aggregates the data we want (primarily it's which terms the course was previously offered, along with some other stuff)
        - note that this could be several hundred requests at once
    3. waits until all of those requests finish
    4. saves the aggregated data to the file `data/[subject].json`

#### Command Line Arguments

| Flag | Description |
| --- | --- |
| `-y` | Skips the initial confirmation prompt |
| `-f` | Forces program to run even if `data/lastupdated` indicates that data is already up to date |

Example: `ts-node getcoursedata.ts -f -y` (you may need to prefix it with `npx`, i.e. `npx ts-node ...` if `ts-node` is not globally installed)

*Note: Command line arguments can only be used when directly running `ts-node getcoursedata.ts` (and not `npm run fetchdata`)*

### Building for Production
```bash
npm run build
```
will run `buildscript.js` which uses esbuild and a plugin for Svelte to compile and bundle everything into a folder called `dist`.
We also "manually" copy `index.html` and the `data` folder into `dist`.

### Running the dev server
We don't have an actual dev server, but esbuild is so fast that simply rebuilding the entire project whenever we make any changes to the files
works well enough (though this obviously won't include some nice things like hot module replacement).
```bash
npm run start
```
uses [npm-run-all](https://www.npmjs.com/package/npm-run-all) to run two commands in parallel:
- `npm run build:watch` which automatically rebuilds the project anytime a file is modified
- `npm run serve` which uses [servor](https://www.npmjs.com/package/servor) to run a web server for the `dist/` folder that reloads the page whenever a
  file in `dist/` is modified
