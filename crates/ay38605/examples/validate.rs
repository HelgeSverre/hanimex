//! Long-run controller/firing check. Run with `cargo run --release --example validate`.
use ay38605::Chip;

fn submarine_x(chip: &Chip) -> f64 {
    let mut pixels = 0;
    let mut sum = 0;
    for y in 230..250 {
        for x in 20..204 {
            if chip.raster[y * 228 + x] & 2 != 0 {
                pixels += 1;
                sum += x;
            }
        }
    }
    assert!(
        pixels > 0,
        "submarine must be visible for position measurement"
    );
    sum as f64 / f64::from(pixels)
}
fn torpedo_pixels(chip: &Chip) -> usize {
    (130..225)
        .flat_map(|y| (20..204).map(move |x| (x, y)))
        .filter(|&(x, y)| chip.raster[y * 228 + x] & 2 != 0)
        .count()
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut chip = Chip::new()?;
    let start = std::time::Instant::now();
    chip.run(71_136 * 200)?;
    let centre = submarine_x(&chip);
    chip.inputs(1, 300, 200, 0)?;
    chip.run(71_136 * 16)?;
    let right = submarine_x(&chip);
    chip.inputs(1, 100, 200, 0)?;
    chip.run(71_136 * 16)?;
    let left = submarine_x(&chip);
    assert!(right > centre, "right control did not move submarine");
    assert!(left < right, "left control did not move submarine");
    let before_fire = torpedo_pixels(&chip);
    chip.inputs(1, 200, 200, 1)?;
    chip.run(71_136 * 20)?;
    let after_fire = torpedo_pixels(&chip);
    assert!(
        after_fire > before_fire,
        "fire input did not produce a torpedo"
    );
    println!(
        "centre={centre}, right={right}, left={left}; torpedo pixels {before_fire} -> {after_fire}; fields={}; elapsed={:?}",
        chip.fields,
        start.elapsed()
    );
    Ok(())
}
