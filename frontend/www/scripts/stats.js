async function getStats(data) {
    return data.map(d => [
        new Date(d.date).getTime(),
        d.exercise_instances.reduce((agg, i) => agg + i.sets * i.number, 0),
    ])
}
