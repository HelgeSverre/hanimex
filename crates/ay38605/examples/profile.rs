use ay38605::Chip;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut c = Chip::new()?;
    c.run(300_000)?;
    #[cfg(all(feature = "profile", not(feature = "reference-engine")))]
    {
        c.circuit.metrics.fill(0);
        c.circuit.visits.fill(0);
        c.circuit.waves.clear();
    }
    for phase in 0..30 {
        c.inputs(1, 60 + (phase % 4) * 40, 180 - (phase % 4) * 40, phase % 16)?;
        c.run(100_000)?;
    }
    #[cfg(all(feature = "profile", not(feature = "reference-engine")))]
    {
        let mut waves: Vec<_> = c.circuit.waves.iter().collect();
        waves.sort_unstable_by(|(a, _), (b, _)| a.cmp(b));
        for (wave, count) in waves {
            println!("wave {count} {wave:?}");
        }
        println!("metrics {:?}", c.circuit.metrics);
        for (n, count) in c.circuit.visits.iter().enumerate() {
            if *count > 0 {
                println!("{n},{count}");
            }
        }
    }
    Ok(())
}
