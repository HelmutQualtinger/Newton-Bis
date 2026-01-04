
import { SimulationConfig, Particle, ColorPalette } from '../types';

export class PhysicsEngine {
  private particles: Particle[] = [];
  private config: SimulationConfig;
  private width: number;
  private height: number;

  constructor(config: SimulationConfig, width: number, height: number) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.init();
  }

  private generateColor(palette: ColorPalette): string {
    let hue = 0;
    let saturation = 100;
    let lightness = 50;

    switch (palette) {
      case 'fireworks':
        hue = Math.floor(Math.random() * 360);
        break;
      case 'cyberpunk':
        hue = Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 280 : Math.floor(Math.random() * 40) + 180;
        break;
      case 'ocean':
        hue = Math.floor(Math.random() * 60) + 170;
        break;
      case 'inferno':
        hue = Math.floor(Math.random() * 50);
        break;
      case 'emerald':
        hue = Math.floor(Math.random() * 60) + 100;
        break;
      case 'monochrome':
        saturation = 0;
        lightness = Math.floor(Math.random() * 50) + 50;
        break;
    }

    return `hsla(${hue}, ${saturation}%, ${lightness}%, 1.0)`;
  }

  private init() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      const mass = Math.random() * Math.random() * 25 + 2; 
      this.particles.push({
        id: i,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        mass: mass,
        radius: Math.sqrt(mass) * 0.5,
        color: this.generateColor(this.config.palette)
      });
    }
  }

  public refreshColors() {
    for (const p of this.particles) {
      p.color = this.generateColor(this.config.palette);
    }
  }

  public setConfig(config: SimulationConfig) {
    const prevCount = this.particles.length;
    const prevPalette = this.config.palette;
    this.config = config;
    
    if (prevCount !== config.particleCount) {
      this.init();
    } else if (prevPalette !== config.palette) {
      this.refreshColors();
    }
  }

  public updateDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public reset() {
    this.init();
  }

  private getDerivatives(
    positionsX: Float32Array,
    positionsY: Float32Array,
    velocitiesX: Float32Array,
    velocitiesY: Float32Array,
    mouseX?: number,
    mouseY?: number,
    mouseStrength?: number
  ) {
    const n = this.particles.length;
    const accelX = new Float32Array(n);
    const accelY = new Float32Array(n);
    const G = this.config.G;
    const softening = 2.0; // Reduced softening for much stronger clumping/attraction

    for (let i = 0; i < n; i++) {
      let fx = 0;
      let fy = 0;
      const m1 = this.particles[i].mass;

      // N-Body gravity calculation
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = positionsX[j] - positionsX[i];
        const dy = positionsY[j] - positionsY[i];
        const distSq = dx * dx + dy * dy + softening;
        const dist = Math.sqrt(distSq);
        
        // F = G * m1 * m2 / r^2
        const force = (G * m1 * this.particles[j].mass) / distSq;
        fx += (force * dx) / dist;
        fy += (force * dy) / dist;
      }

      // Attractor gravity
      if (mouseX !== undefined && mouseY !== undefined && mouseStrength !== undefined) {
        const adx = mouseX - positionsX[i];
        const ady = mouseY - positionsY[i];
        const adistSq = adx * adx + ady * ady + 50.0;
        const adist = Math.sqrt(adistSq);
        const aForce = (mouseStrength * m1) / adistSq;
        fx += (aForce * adx) / adist;
        fy += (aForce * ady) / adist;
      }

      accelX[i] = fx / m1;
      accelY[i] = fy / m1;
    }

    return { dx: velocitiesX, dy: velocitiesY, dvx: accelX, dvy: accelY };
  }

  public step(mouseX?: number, mouseY?: number, mouseStrength?: number) {
    if (this.config.paused) return;

    const n = this.particles.length;
    const dt = 0.5;
    const friction = 1 - this.config.friction;
    const elasticity = this.config.collisionElasticity;

    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      x[i] = this.particles[i].x;
      y[i] = this.particles[i].y;
      vx[i] = this.particles[i].vx;
      vy[i] = this.particles[i].vy;
    }

    // RK4 Integration
    const k1 = this.getDerivatives(x, y, vx, vy, mouseX, mouseY, mouseStrength);

    const x2 = new Float32Array(n);
    const y2 = new Float32Array(n);
    const vx2 = new Float32Array(n);
    const vy2 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      x2[i] = x[i] + k1.dx[i] * 0.5 * dt;
      y2[i] = y[i] + k1.dy[i] * 0.5 * dt;
      vx2[i] = vx[i] + k1.dvx[i] * 0.5 * dt;
      vy2[i] = vy[i] + k1.dvy[i] * 0.5 * dt;
    }
    const k2 = this.getDerivatives(x2, y2, vx2, vy2, mouseX, mouseY, mouseStrength);

    const x3 = new Float32Array(n);
    const y3 = new Float32Array(n);
    const vx3 = new Float32Array(n);
    const vy3 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      x3[i] = x[i] + k2.dx[i] * 0.5 * dt;
      y3[i] = y[i] + k2.dy[i] * 0.5 * dt;
      vx3[i] = vx[i] + k2.dvx[i] * 0.5 * dt;
      vy3[i] = vy[i] + k2.dvy[i] * 0.5 * dt;
    }
    const k3 = this.getDerivatives(x3, y3, vx3, vy3, mouseX, mouseY, mouseStrength);

    const x4 = new Float32Array(n);
    const y4 = new Float32Array(n);
    const vx4 = new Float32Array(n);
    const vy4 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      x4[i] = x[i] + k3.dx[i] * dt;
      y4[i] = y[i] + k3.dy[i] * dt;
      vx4[i] = vx[i] + k3.dvx[i] * dt;
      vy4[i] = vy[i] + k3.dvy[i] * dt;
    }
    const k4 = this.getDerivatives(x4, y4, vx4, vy4, mouseX, mouseY, mouseStrength);

    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      p.vx = (p.vx + (dt / 6) * (k1.dvx[i] + 2 * k2.dvx[i] + 2 * k3.dvx[i] + k4.dvx[i])) * friction;
      p.vy = (p.vy + (dt / 6) * (k1.dvy[i] + 2 * k2.dvy[i] + 2 * k3.dvy[i] + k4.dvy[i])) * friction;
      p.x += (dt / 6) * (k1.dx[i] + 2 * k2.dx[i] + 2 * k3.dx[i] + k4.dx[i]);
      p.y += (dt / 6) * (k1.dy[i] + 2 * k2.dy[i] + 2 * k3.dy[i] + k4.dy[i]);

      if (p.x < p.radius) {
        p.x = p.radius;
        p.vx *= -elasticity;
      } else if (p.x > this.width - p.radius) {
        p.x = this.width - p.radius;
        p.vx *= -elasticity;
      }
      if (p.y < p.radius) {
        p.y = p.radius;
        p.vy *= -elasticity;
      } else if (p.y > this.height - p.radius) {
        p.y = this.height - p.radius;
        p.vy *= -elasticity;
      }
    }
  }

  public getParticles() {
    return this.particles;
  }
}
