import {
  makeBirdEnemy,
  makeFlameEnemy,
  makeGuyEnemy,
  makePlayer,
  setControls,
} from "./entities";
import { k } from "./kaboomCtx";
import { makeMap } from "./utils";

async function gameSetup() {
  k.loadSprite("assets", "./kirby-like.png", {
    sliceX: 9,
    sliceY: 10,
    anims: {
      kirbIdle: 0,
      kirbInhaling: 1,
      kirbFull: 2,
      kirbInhaleEffect: { from: 3, to: 8, speed: 15, loop: true },
      shootingStar: 9,
      flame: { from: 36, to: 37, speed: 4, loop: true },
      guyIdle: 18,
      guyWalk: { from: 18, to: 19, speed: 4, loop: true },
      bird: { from: 27, to: 28, speed: 4, loop: true },
    },
  });

  k.loadSprite("level1", "./level1.png");

  const { map: level1Layout, spawnPoints: level1SpawnPoints } = await makeMap(
    k,
    "level1",
  );

  k.scene("level1", () => {
    k.setGravity(2100);
    k.add([
      k.rect(k.width(), k.height()),
      k.color(k.Color.fromHex("#f7d7db")),
      k.fixed(),
    ]);

    k.add(level1Layout);

    const kirb = makePlayer(
      k,
      level1SpawnPoints.Player[0].x,
      level1SpawnPoints.Player[0].y,
    );

    setControls(k, kirb);
    k.add(kirb);
    k.camScale(k.vec2(0.7));
    k.onUpdate(() => {
      if (kirb.pos.x < level1Layout.pos.x + 432) {
        k.camPos(kirb.pos.x + 500, 850);
      }
    });

    for (const flame of level1SpawnPoints.Flame) {
      makeFlameEnemy(k, flame.x, flame.y);
    }

    for (const flame of level1SpawnPoints.Guy) {
      makeGuyEnemy(k, flame.x, flame.y);
    }

    for (const bird of level1SpawnPoints.Bird) {
      const possibleSpeeds = [100, 200, 300];

      k.loop(10, () => {
        makeBirdEnemy(
          k,
          bird.x,
          bird.y,
          possibleSpeeds[Math.floor(Math.random() * possibleSpeeds.length)],
        );
      });
    }
  });
  // let curTween = null;
  // addEventListener("keypress", (e: KeyboardEvent) => {
  //   console.log("EVENT: ", e.code);
  //   if (e.code == "KeyP") {
  //     k.paused = !k.paused;

  //     if (curTween) curTween.cancel();
  //     curTween = k.tween(
  //       pauseMenu.pos,
  //       k.paused ? k.center() : k.center().add(0, 700),
  //       1,
  //       (p) => (pauseMenu.pos = p),
  //       k.easings.easeOutElastic,
  //     );
  //     if (k.paused) {
  //       pauseMenu.hidden = false;
  //       pauseMenu.paused = false;
  //     } else {
  //       curTween.onEnd(() => {
  //         pauseMenu.hidden = true;
  //         pauseMenu.paused = true;
  //       });
  //     }
  //   }
  // });

  // const pauseMenu = k.add([
  //   k.rect(300, 400),
  //   k.color(255, 255, 255),
  //   k.outline(4),
  //   k.anchor("center"),
  //   k.pos(k.center().add(0, 700)),
  // ]);

  k.go("level1");
}

gameSetup();
