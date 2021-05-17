<script>
	import courseData from '../data/coursedata.json';
	import Course from './Course.svelte';

	const { lastUpdated, courses } = courseData;

	// TODO: improve colors
	const colorMap = {
    fall: '#E84A27',
    spring: '#003366',
    summer: '#48A9A6',
    winter: '#7785AC',
  };

	const maxTerms = Math.max(...courses.map(({ allTerms }) => allTerms.length));
	let numTerms = 8;
	$: sanitizedNumTerms = Math.min(Math.max(0, Number(numTerms) || 0), maxTerms);
</script>

<main>
	<h1>UIUC Course Terms</h1>

	<p class="last-updated">Last Updated: {lastUpdated}</p>

	<div class="legend">
		{#each Object.entries(colorMap) as [season, color] (season)}
			<div class="key">
				<div class="color" style="background-color: {color};" />
				<p class="season">{season}</p>
			</div>
		{/each}
	</div>

	<div class="num-terms">
		Displaying
		<input type="number" bind:value={numTerms} step=1 min=0 max={maxTerms} />
		most recent offering{numTerms === 1 ? '' : 's'} of each course
	</div>

	{#each courses as course (course.subject + course.number)}	
		<Course {course} {colorMap} numTerms={sanitizedNumTerms} />
	{/each}
</main>

<style>
h1 {
	text-align: center;
	margin-top: 30px;
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
}

.num-terms input {
	font-family: inherit;
	font-size: 1em;
	text-align: center;
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