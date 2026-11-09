use ay38605::Chip;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut c = Chip::new()?;
    let t = std::time::Instant::now();
    c.run(100_000)?;
    let seconds = t.elapsed().as_secs_f64();
    println!(
        "{:.0} clocks/s; {:.2}% real time",
        100_000.0 / seconds,
        100_000.0 / seconds / 3_579_545.0 * 100.0
    );
    #[cfg(all(feature = "profile", not(feature = "reference-engine")))]
    println!(
        "recalc / updates / queued per clock: {:?}",
        c.circuit.metrics.map(|n| n as f64 / 100_000.0)
    );
    Ok(())
}
