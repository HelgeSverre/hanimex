use hanimex::{Direction, NavalInput, NavalMode, Projectile, SportsGame, Submarine};

#[test]
fn destroyer_moves_twice_as_fast_and_neutral_stops() {
    let mut game = Submarine::new(NavalMode::TwoPlayer);
    let before = (game.submarine.x, game.destroyer.x);
    game.tick(NavalInput {
        submarine: Direction::Positive,
        destroyer: Direction::Positive,
        ..Default::default()
    });
    assert_eq!(game.submarine.x - before.0, 1);
    assert_eq!(game.destroyer.x - before.1, 2);
    let before = (game.submarine.x, game.destroyer.x);
    game.tick(NavalInput::default());
    assert_eq!((game.submarine.x, game.destroyer.x), before);
}
#[test]
fn firing_interval_is_four_seconds_even_after_projectile_disappears() {
    let mut game = Submarine::new(NavalMode::TwoPlayer);
    let fire = NavalInput {
        torpedo: true,
        ..Default::default()
    };
    game.tick(fire);
    game.torpedo = None;
    for _ in 0..199 {
        game.tick(fire);
        assert!(game.torpedo.is_none());
    }
    game.tick(fire);
    assert!(game.torpedo.is_some());
}
#[test]
fn destroyer_hit_scores_five_and_freezes_for_two_seconds() {
    let mut game = Submarine::new(NavalMode::TwoPlayer);
    game.torpedo = Some(Projectile {
        x: game.destroyer.x,
        y: 86,
    });
    game.tick(NavalInput::default());
    assert_eq!(game.scores, [5, 0]);
    assert_eq!(game.destroyer.frozen_ticks, 100);
    let x = game.destroyer.x;
    for _ in 0..100 {
        game.tick(NavalInput {
            destroyer: Direction::Positive,
            ..Default::default()
        });
    }
    assert_eq!(game.destroyer.x, x);
    game.tick(NavalInput {
        destroyer: Direction::Positive,
        ..Default::default()
    });
    assert_eq!(game.destroyer.x, x + 2);
}
#[test]
fn submarine_hit_scores_two_and_game_stops_at_fifteen() {
    let mut game = Submarine::new(NavalMode::TwoPlayer);
    game.scores = [0, 14];
    game.depth_charge = Some(Projectile {
        x: game.submarine.x,
        y: 192,
    });
    game.tick(NavalInput::default());
    assert_eq!(game.scores, [0, 15]);
    assert!(game.finished());
    let frame = game.frame();
    for _ in 0..100 {
        game.tick(NavalInput {
            submarine: Direction::Positive,
            torpedo: true,
            ..Default::default()
        });
    }
    assert_eq!(game.frame(), frame);
}
#[test]
fn matrix_distinguishes_tennis_from_squash_and_rejects_unused_slots() {
    assert_eq!(SportsGame::from_matrix(1, 1), Some(SportsGame::Tennis));
    assert_eq!(SportsGame::from_matrix(1, 3), Some(SportsGame::Squash));
    assert_eq!(SportsGame::from_matrix(4, 2), Some(SportsGame::TargetTwo));
    assert_eq!(SportsGame::from_matrix(3, 3), None);
    assert_eq!(SportsGame::from_matrix(0, 1), None);
}
#[test]
fn cargo_hit_uses_documented_one_or_two_point_weight() {
    for (capital, points) in [(false, 1), (true, 2)] {
        let mut game = Submarine::new(NavalMode::TwoPlayer);
        game.capital_ship = capital;
        game.cargo_x = Some(240);
        game.torpedo = Some(Projectile { x: 240, y: 60 });
        game.tick(NavalInput::default());
        assert_eq!(game.scores[0], points);
        assert!(game.cargo_x.is_none());
    }
}
