<script>
  import tippy from "sveltejs-tippy";

  export let course;
  export let colorMap;
  export let numTerms;

  $: title = `${course.subject} ${course.number}: ${course.name}`;
  $: terms = course.allTerms.slice(0, numTerms).map(term => term.split(' '));
</script>

<div class="course">
  <h4 class="title" title={title}>{title}</h4>
  <div class="terms" style="grid-template-columns: {'1fr '.repeat(numTerms)};">
    {#each terms as [season, year]}
      <div
        class="term"
        style="background-color: {colorMap[season.toLowerCase()]};"
        use:tippy={{ content: `${season} ${year}` }}
      >
        {year}
      </div>
    {/each}
  </div>
</div>

<style>
.course {
  display: flex;
  margin: 10px 0;
}

.title {
  width: 300px;
  min-width: 300px;
  padding: 5px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  margin: 0;
}

.terms {
  flex: 1;
  display: grid;
  direction: rtl;
  width: 100%;
  overflow: auto;

  /* hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.terms::-webkit-scrollbar {
  display: none;
}

.term {
  flex: 1;
  margin: 1px;
  display: flex;
  color: white;
  justify-content: center;
  align-items: center;
}
</style>