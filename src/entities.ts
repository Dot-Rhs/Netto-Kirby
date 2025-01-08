import {
  AreaComp,
  BodyComp,
  DoubleJumpComp,
  GameObj,
  HealthComp,
  KaboomCtx,
  OpacityComp,
  PosComp,
  ScaleComp,
  SpriteComp,
} from "kaboom";
import { scale } from "./constants";

type PlayerGameObj = GameObj<
  SpriteComp &
    AreaComp &
    BodyComp &
    PosComp &
    ScaleComp &
    DoubleJumpComp &
    HealthComp &
    OpacityComp & {
      speed: number;
      direction: string;
      isInhaling: boolean;
      isFull: boolean;
    }
>;

export function makePlayer(k: KaboomCtx, posX: number, posY: number) {
  const player = k.make([
    k.sprite("assets", { anim: "kirbIdle" }),
    k.area({ shape: new k.Rect(k.vec2(4, 5.9), 8, 10) }),
    k.body(),
    k.pos(posX * scale, posY * scale),
    k.scale(scale),
    k.doubleJump(10),
    k.health(3),
    k.opacity(1),
    {
      speed: 300,
      direction: "right",
      isInhaling: false,
      isFull: false,
    },
    "player",
  ]);

  player.onCollide("enemy", async (enemy: GameObj) => {
    if (player.isInhaling && enemy.isInhalable) {
      player.isInhaling = false;
      k.destroy(enemy);
      player.isFull = true;
      return;
    }

    if (player.hp() === 0) {
      k.destroy(player);
      k.go("level2");
      return;
    }

    player.hurt();

    await k.tween(
      player.opacity,
      0,
      0.05,
      (val) => (player.opacity = val),
      k.easings.linear,
    );

    await k.tween(
      player.opacity,
      1,
      0.05,
      (val) => (player.opacity = val),
      k.easings.linear,
    );
  });

  player.onCollide("exit", () => {
    k.go("level2");
  });

  const inhaleEffect = k.add([
    k.sprite("assets", { anim: "kirbInhaleEffect" }),
    k.pos(),
    k.scale(scale),
    k.opacity(0),
    "inhaleEffect",
  ]);

  const inhaleZone = player.add([
    k.area({ shape: new k.Rect(k.vec2(0), 20, 4) }),
    k.pos(),
    "inhaleZone",
  ]);

  inhaleZone.onUpdate(() => {
    if (player.direction === "left") {
      inhaleZone.pos = k.vec2(-14, 8);
      inhaleEffect.pos = k.vec2(player.pos.x - 60, player.pos.y + 0);
      inhaleEffect.flipX = true;
      return;
    }
    inhaleZone.pos = k.vec2(14, 8);
    inhaleEffect.pos = k.vec2(player.pos.x + 60, player.pos.y + 0);
    inhaleEffect.flipX = false;
  });

  player.onUpdate(() => {
    if (player.pos.y > 2000) {
      k.go("level1");
    }
  });

  return player;
}

export const setControls = (k: KaboomCtx, player: PlayerGameObj) => {
  const inhaleEffectRef = k.get("inhaleEffect")[0];

  k.onKeyDown((key) => {
    switch (key) {
      case "left":
        player.direction = "left";
        player.flipX = true;
        player.move(-player.speed, 0);
        break;
      case "right":
        player.direction = "right";
        player.flipX = false;
        player.move(player.speed, 0);
        break;
      case "z":
        if (player.isFull) {
          player.play("kirbFull");
          inhaleEffectRef.opacity = 0;
          break;
        }

        player.isInhaling = true;
        player.play("kirbInhaling");
        inhaleEffectRef.opacity = 1;
        break;
      default:
    }
  });

  k.onKeyPress((key) => {
    switch (key) {
      case "x":
        player.doubleJump();
        break;
      default:
    }
  });

  k.onKeyRelease(async (key) => {
    if (key === "z") {
      if (player.isFull) {
        player.play("kirbInhaling");
        const shootingStar = k.add([
          k.sprite("assets", {
            anim: "shootingStar",
            flipX: player.direction === "right",
          }),
          k.area({ shape: new k.Rect(k.vec2(5, 4), 6, 6) }),
          k.pos(
            player.direction === "left" ? player.pos.x - 80 : player.pos.x + 80,
            player.pos.y + 5,
          ),
          k.scale(scale),
          player.direction === "left"
            ? k.move(k.LEFT, 800)
            : k.move(k.RIGHT, 800),
          "shootingStar",
        ]);

        shootingStar.onCollide("platform", () => {
          addExplode(k, shootingStar.pos, 2, 10, 12);
          k.destroy(shootingStar);
        });

        player.isFull = false;
        await k.wait(1, () => player.play("kirbIdle"));

        return;
      }

      inhaleEffectRef.opacity = 0;
      player.isInhaling = false;
      player.play("kirbIdle");
    }
  });
};

function grow(k: KaboomCtx, rate: number) {
  return {
    update() {
      const n = rate * k.dt();
      (this as GameObj).scale.x += n;
      (this as GameObj).scale.y += n;
    },
  };
}

function addExplode(
  k: KaboomCtx,
  p: GameObj["pos"],
  n: number,
  rad: number,
  size: number,
) {
  for (let i = 0; i < n; i++) {
    k.wait(k.rand(n * 0.1), () => {
      for (let i = 0; i < 2; i++) {
        k.add([
          k.pos(p.add(k.rand(k.vec2(-rad), k.vec2(rad)))),
          k.rect(4, 4),
          k.scale(1 * size, 1 * size),
          k.lifespan(0.1),
          grow(k, k.rand(1, 12) * size),
          k.anchor("center"),
        ]);
      }
    });
  }
}

export const makeInhalable = (k: KaboomCtx, enemy: GameObj) => {
  enemy.onCollide("inhaleZone", () => {
    enemy.isInhalable = true;
  });

  enemy.onCollideEnd("inhaleZone", () => {
    enemy.isInhalable = false;
  });

  enemy.onCollide("shootingStar", (shootingStar: GameObj) => {
    k.shake(70);
    addExplode(k, enemy.pos, 8, 100, 40);
    k.destroy(enemy);
    k.destroy(shootingStar);
  });

  const playerRef = k.get("player")[0] as PlayerGameObj;

  enemy.onUpdate(() => {
    if (playerRef.isInhaling && enemy.isInhalable) {
      if (playerRef.direction === "right") {
        enemy.move(-800, 0);
        return;
      }
      enemy.move(800, 0);
    }
  });
};

export const makeFlameEnemy = (k: KaboomCtx, posX: number, posY: number) => {
  const flame = k.add([
    k.sprite("assets", { anim: "flame" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(4, 6), 8, 10),
      collisionIgnore: ["enemy"],
    }),
    k.body(),
    k.state("idle", ["idle", "jump"]),
    { isInhalable: false },
    "enemy",
  ]);

  makeInhalable(k, flame);

  flame.onStateEnter("idle", async () => {
    await k.wait(1);
    flame.enterState("jump");
  });

  flame.onStateEnter("jump", () => {
    flame.jump(1000);
  });

  flame.onStateUpdate("jump", () => {
    if (flame.isGrounded()) {
      flame.enterState("idle");
    }
  });
};

export const makeGuyEnemy = (k: KaboomCtx, posX: number, posY: number) => {
  const guy = k.add([
    k.sprite("assets", { anim: "guyWalk" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(2, 3.9), 12, 12),
      collisionIgnore: ["enemy"],
    }),
    k.body(),
    k.state("idle", ["idle", "left", "right", "jump"]),
    { isInhalable: false, speed: 100 },
    "enemy",
  ]);

  makeInhalable(k, guy);

  guy.onStateEnter("idle", async () => {
    await k.wait(1);
    guy.enterState("left");
  });

  guy.onStateEnter("left", async () => {
    guy.flipX = false;
    await k.wait(2);
    guy.enterState("right");
  });

  guy.onStateUpdate("left", () => {
    guy.move(-guy.speed, 0);
  });

  guy.onStateEnter("right", async () => {
    guy.flipX = true;
    await k.wait(2);
    guy.enterState("left");
  });

  guy.onStateUpdate("right", () => {
    guy.move(guy.speed, 0);
  });

  guy.onStateUpdate("jump", () => {
    if (guy.isGrounded()) {
      guy.enterState("idle");
    }
  });
};

export const makeBirdEnemy = (
  k: KaboomCtx,
  posX: number,
  posY: number,
  speed: number,
) => {
  const bird = k.add([
    k.sprite("assets", { anim: "bird" }),
    k.scale(scale),
    k.pos(posX * scale, posY * scale),
    k.area({
      shape: new k.Rect(k.vec2(4, 6), 8, 10),
      collisionIgnore: ["enemy"],
    }),
    k.body({ isStatic: true }),
    k.move(k.LEFT, speed),
    k.offscreen({ destroy: true, distance: 400 }),
    // k.state("idle", ["idle", "left", "right"]),
    // { isInhalable: false, speed: 100 },
    "enemy",
  ]);

  makeInhalable(k, bird);

  // bird.onStateEnter("idle", async () => {
  //   await k.wait(1);
  //   bird.enterState("left");
  // });

  // bird.onStateEnter("left", async () => {
  //   bird.flipX = false;
  //   await k.wait(2);
  //   bird.enterState("right");
  // });

  // bird.onStateUpdate("left", () => {
  //   bird.move(-bird.speed, 0);
  // });

  // bird.onStateEnter("right", async () => {
  //   bird.flipX = true;
  //   await k.wait(2);
  //   bird.enterState("left");
  // });

  // bird.onStateUpdate("right", () => {
  //   bird.move(bird.speed, 0);
  // });

  // bird.onStateUpdate("jump", () => {
  //   if (bird.isGrounded()) {
  //     bird.enterState("idle");
  //   }
  // });
};
