<script>
	import courseData from '../data/coursedata.json';
	import Course from './Course.svelte';

	// TODO: improve colors
	const colorMap = {
    fall: '#E84A27',
    spring: '#003366',
    summer: '#48A9A6',
    winter: '#7785AC',
  };

	// const maxTerms = Math.max(...courseData.map(({ allTerms }) => allTerms.length));
	const maxTerms = 8;
</script>

<main>
	<h1>UIUC Course Terms</h1>

	<div class="legend">
		{#each Object.entries(colorMap) as [season, color] (season)}
			<div class="key">
				<div class="color" style="background-color: {color};" />
				<p class="season">{season}</p>
			</div>
		{/each}
	</div>

	{#each courseData as course (course.subject + course.number)}	
		<div>
			<Course {course} {colorMap} {maxTerms} />
		</div>
	{/each}
</main>

<style>
h1 {
	text-align: center;
}

.legend {
	display: flex;
	justify-content: center;
	margin-bottom: 15px;
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