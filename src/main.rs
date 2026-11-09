use hanimex::{Direction, HEIGHT, NavalInput, NavalMode, Submarine, WIDTH};
use std::{
    error::Error,
    fs::File,
    io::{self, BufRead, BufWriter, Write},
};

const HELP: &str = "hanimex - experimental PC-50x behavioral model (not hardware-accurate yet)

Usage:
  hanimex research         Print the identified hardware and preservation leads
  hanimex frame PATH       Write a deterministic Submarine demo frame as PPM
  hanimex play             Turn-based terminal Submarine against the destroyer
  hanimex --help
  hanimex --version

Play controls: a/d = move submarine, f = fire, Enter = coast, r = reset, q = quit.
Each command advances half a second; combine letters, e.g. df. No real-time UI or audio yet.";

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [] => println!("{HELP}"),
        [arg] if arg == "--help" || arg == "-h" => println!("{HELP}"),
        [arg] if arg == "--version" || arg == "-V" => {
            println!("hanimex {}", env!("CARGO_PKG_VERSION"))
        }
        [arg] if arg == "research" => println!(
            "Likely family: Soundic SD-050 / PC-50x; Hanimex sold sibling consoles.\n625-B is the PAL television label.\nPC-501 Supersportic: AY-3-8610 fixed game logic.\nPC-505 Submarine: AY-3-8605 fixed game logic.\nNo conventional cartridge ROM is required.\nOriginal silicon simulation: Cole Johnson, 2019 (old hosting currently unavailable).\nRead research/HARDWARE.md and research/EMULATION.md for sources and caveats."
        ),
        [arg, path] if arg == "frame" => {
            let mut game = Submarine::new(NavalMode::OnePlayer);
            for tick in 0..40 {
                game.tick(NavalInput {
                    submarine: Direction::Negative,
                    torpedo: tick == 0,
                    ..Default::default()
                });
            }
            write_ppm(path, &game.frame())?;
            eprintln!("Wrote {path}; provisional geometry and sprites, not a hardware capture.");
        }
        [arg] if arg == "play" => play()?,
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "unknown command; run hanimex --help",
            )
            .into());
        }
    }
    Ok(())
}
fn write_ppm(path: &str, frame: &[u32]) -> io::Result<()> {
    let mut file = BufWriter::new(File::create(path)?);
    writeln!(file, "P6\n{WIDTH} {HEIGHT}\n255")?;
    for pixel in frame {
        file.write_all(&[(pixel >> 16) as u8, (pixel >> 8) as u8, *pixel as u8])?;
    }
    file.flush()
}
fn play() -> io::Result<()> {
    let mut game = Submarine::new(NavalMode::OnePlayer);
    println!("{HELP}\n");
    show(&game);
    for line in io::stdin().lock().lines() {
        let command = line?;
        if command.trim() == "q" {
            break;
        }
        if command.trim() == "r" {
            game = Submarine::new(NavalMode::OnePlayer);
        } else {
            if !command.chars().all(|c| "adf ".contains(c)) {
                eprintln!("Use a/d/f, Enter, r or q.");
                continue;
            }
            let direction = match (command.contains('a'), command.contains('d')) {
                (true, false) => Direction::Negative,
                (false, true) => Direction::Positive,
                _ => Direction::Neutral,
            };
            for _ in 0..25 {
                game.tick(NavalInput {
                    submarine: direction,
                    torpedo: command.contains('f'),
                    ..Default::default()
                });
            }
        }
        show(&game);
    }
    Ok(())
}
fn show(game: &Submarine) {
    let frame = game.frame();
    for y in (40..224).step_by(8) {
        let line: String = (0..WIDTH)
            .step_by(4)
            .map(|x| {
                if (y..y + 8).any(|py| (x..x + 4).any(|px| frame[py * WIDTH + px] == 0xffffff)) {
                    '#'
                } else {
                    ' '
                }
            })
            .collect();
        println!("{line}");
    }
    println!(
        "SUB {:02} : {:02} DESTROYER{}",
        game.scores[0],
        game.scores[1],
        if game.finished() {
            " - GAME OVER; r to reset"
        } else {
            ""
        }
    );
}
