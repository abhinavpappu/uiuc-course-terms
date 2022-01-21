<script>
	import Select from 'svelte-select';
	import subjects from '../data/subjects.json';
	import Course from './Course.svelte';

	const colorMap = {
    fall: '#E84A27',
    spring: '#003366',
    summer: '#48A9A6',
    winter: '#7785AC',
  };

	const subjectOptions = subjects.map(subject => ({ value: subject, label: subject }));
	let selectedSubject = subjectOptions[0];

	const lastUpdatedPromise = fetch('/data/lastupdated.txt').then(res => res.text());
	
	// key: subject name, value: course data object
	const coursesCache = {};
	async function getCourseData(subject) {
		if (!coursesCache[subject]) {
			coursesCache[subject] = await fetch(`/data/${selectedSubject.value}.json`).then(res => res.json())
		}
		return coursesCache[subject];
	}

	$: courseDataPromise = getCourseData(selectedSubject.value);

	let numTerms = 8;
	let maxTerms = 100; // arbitrary value that will get reassigned below
	$: courseDataPromise.then(({ courses }) => maxTerms = Math.max(...courses.map(({ allTerms }) => allTerms.length)));
	$: sanitizedNumTerms = Math.min(Math.max(0, Number(numTerms) || 0), maxTerms);
</script>

<main>
	<h1>UIUC Course Terms</h1>

	{#await lastUpdatedPromise then lastUpdated}
		<p class="last-updated">Last Updated: {new Date(Number(lastUpdated)).toLocaleDateString()}</p>
	{/await}

	<div class="legend">
		{#each Object.entries(colorMap) as [season, color] (season)}
			<div class="key">
				<div class="color" style="background-color: {color};" />
				<p class="season">{season}</p>
			</div>
		{/each}
	</div>

	<div class="num-terms">
		<span>Displaying</span>
		<input type="number" bind:value={numTerms} step=1 min=0 max={maxTerms} />
		<span>most recent offering{numTerms === 1 ? '' : 's'} of each</span>
		<Select
			items={subjectOptions}
			selectedValue={selectedSubject}
			on:select={e => selectedSubject = e.detail}
			placeholder="Subject"
			isClearable={false}
			containerStyles="display: inline-block; --height: 30px; min-width: 70px"
			inputStyles="cursor: pointer"
		/>
		<span>course</span>
	</div>

	{#await courseDataPromise then { courses } }
		{#each courses as course (course.subject + course.number)}	
			<Course {course} {colorMap} numTerms={sanitizedNumTerms} />
		{/each}
	{/await}
</main>

<style>
h1 {
	text-align: center;
	margin-top: 30px;
	margin-bottom: 15px;
}

.last-updated {
	margin: 0;
	position: absolute;
	top: 7px;
	right: 10px;
}

.legend {
	display: flex;
	justify-content: center;
	margin-bottom: 10px;
}

.num-terms {
	text-align: center;
	margin-bottom: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 5px;
}

.num-terms input {
	font-family: inherit;
	font-size: 1em;
	text-align: center;
	border: 1px solid #d8dbdf;
	border-radius: 3px;
}

.num-terms span {
	margin: 0 5px;
}

.key {
	display: flex;
	align-items: center;
	margin: 0 20px;
}

.color {
	height: 25px;
	width: 25px;
	border-radius: 7px;
	margin-right: 10px;
}

.season {
	text-transform: capitalize;
}

</style>