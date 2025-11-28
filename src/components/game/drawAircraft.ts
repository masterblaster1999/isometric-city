/**
 * Aircraft drawing utilities - airplanes and helicopters
 * Extracted from CanvasIsometricGrid for better modularity
 */

import { Airplane, Helicopter, TILE_WIDTH, TILE_HEIGHT } from './types';

/**
 * Draw airplanes with contrails
 */
export function drawAirplanes(
  ctx: CanvasRenderingContext2D,
  airplanes: Airplane[],
  viewBounds: { viewLeft: number; viewTop: number; viewRight: number; viewBottom: number },
  hour: number,
  navLightFlashTimer: number
): void {
  if (airplanes.length === 0) return;

  for (const plane of airplanes) {
    // Draw contrails first (behind plane)
    if (plane.contrail.length > 0) {
      ctx.save();
      for (const particle of plane.contrail) {
        // Skip if outside viewport
        if (
          particle.x < viewBounds.viewLeft ||
          particle.x > viewBounds.viewRight ||
          particle.y < viewBounds.viewTop ||
          particle.y > viewBounds.viewBottom
        ) {
          continue;
        }

        const size = 3 + particle.age * 8; // Contrails expand over time
        const opacity = particle.opacity * 0.4 * plane.altitude; // Fade with altitude

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Skip plane rendering if outside viewport
    if (
      plane.x < viewBounds.viewLeft - 50 ||
      plane.x > viewBounds.viewRight + 50 ||
      plane.y < viewBounds.viewTop - 50 ||
      plane.y > viewBounds.viewBottom + 50
    ) {
      continue;
    }

    // Draw shadow (when low altitude)
    if (plane.altitude < 0.8) {
      const shadowOffset = (1 - plane.altitude) * 15;
      const shadowScale = 0.6 + plane.altitude * 0.4;
      const shadowOpacity = 0.3 * (1 - plane.altitude);

      ctx.save();
      ctx.translate(plane.x + shadowOffset, plane.y + shadowOffset * 0.5);
      ctx.rotate(plane.angle);
      ctx.scale(shadowScale, shadowScale * 0.5);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw airplane
    ctx.save();
    ctx.translate(plane.x, plane.y);
    ctx.rotate(plane.angle);

    // Scale based on altitude (appears larger when higher/closer)
    const altitudeScale = 0.7 + plane.altitude * 0.5;
    ctx.scale(altitudeScale, altitudeScale);

    // Fuselage - cylindrical body (rounded rectangle shape)
    ctx.fillStyle = plane.color;
    ctx.beginPath();
    // Draw a more cylindrical fuselage using a rounded rect approach
    const fuselageLength = 18;
    const fuselageWidth = 2.5; // Thinner for more cylindrical look
    ctx.moveTo(-fuselageLength, -fuselageWidth);
    ctx.lineTo(fuselageLength - 2, -fuselageWidth);
    ctx.quadraticCurveTo(fuselageLength, -fuselageWidth * 0.5, fuselageLength, 0);
    ctx.quadraticCurveTo(fuselageLength, fuselageWidth * 0.5, fuselageLength - 2, fuselageWidth);
    ctx.lineTo(-fuselageLength, fuselageWidth);
    ctx.quadraticCurveTo(-fuselageLength - 2, fuselageWidth, -fuselageLength - 2, 0);
    ctx.quadraticCurveTo(-fuselageLength - 2, -fuselageWidth, -fuselageLength, -fuselageWidth);
    ctx.closePath();
    ctx.fill();

    // Wings - connected to fuselage body
    ctx.fillStyle = plane.color;
    ctx.beginPath();
    ctx.moveTo(0, -fuselageWidth);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-12, -18);
    ctx.lineTo(-4, -fuselageWidth);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, fuselageWidth);
    ctx.lineTo(-8, 18);
    ctx.lineTo(-12, 18);
    ctx.lineTo(-4, fuselageWidth);
    ctx.closePath();
    ctx.fill();

    // Tail fin
    ctx.fillStyle = plane.color;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-20, -8);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();

    // Horizontal stabilizers
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-18, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-20, 6);
    ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fill();

    // Engine nacelles
    ctx.fillStyle = '#475569'; // Dark gray
    ctx.beginPath();
    ctx.ellipse(-2, -8, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-2, 8, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Navigation lights at night (hour >= 20 || hour < 6)
    const isNight = hour >= 20 || hour < 6;
    if (isNight) {
      const strobeOn = Math.sin(navLightFlashTimer * 8) > 0.85; // Sharp, brief flash

      // Red nav light on port (left) wingtip
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-10, -17, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Green nav light on starboard (right) wingtip
      ctx.fillStyle = '#33ff33';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-10, 17, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // White strobe/anti-collision light on tail (flashing) - BRIGHT
      if (strobeOn) {
        // Draw multiple layers for intense brightness
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(-18, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Inner bright core
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(-18, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

/**
 * Draw helicopters with rotor wash
 */
export function drawHelicopters(
  ctx: CanvasRenderingContext2D,
  helicopters: Helicopter[],
  viewBounds: { viewLeft: number; viewTop: number; viewRight: number; viewBottom: number },
  hour: number,
  navLightFlashTimer: number
): void {
  if (helicopters.length === 0) return;

  for (const heli of helicopters) {
    // Draw rotor wash/exhaust particles first (behind helicopter)
    if (heli.rotorWash.length > 0) {
      ctx.save();
      for (const particle of heli.rotorWash) {
        // Skip if outside viewport
        if (
          particle.x < viewBounds.viewLeft ||
          particle.x > viewBounds.viewRight ||
          particle.y < viewBounds.viewTop ||
          particle.y > viewBounds.viewBottom
        ) {
          continue;
        }

        const size = 1.5 + particle.age * 4; // Smaller than plane contrails
        const opacity = particle.opacity * 0.25 * heli.altitude;

        ctx.fillStyle = `rgba(200, 200, 200, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Skip helicopter rendering if outside viewport
    if (
      heli.x < viewBounds.viewLeft - 30 ||
      heli.x > viewBounds.viewRight + 30 ||
      heli.y < viewBounds.viewTop - 30 ||
      heli.y > viewBounds.viewBottom + 30
    ) {
      continue;
    }

    // Draw shadow (always visible since helicopters fly lower)
    const shadowOffset = (0.5 - heli.altitude) * 10 + 3;
    const shadowScale = 0.5 + heli.altitude * 0.3;
    const shadowOpacity = 0.25 * (0.6 - heli.altitude * 0.3);

    ctx.save();
    ctx.translate(heli.x + shadowOffset, heli.y + shadowOffset * 0.5);
    ctx.rotate(heli.angle);
    ctx.scale(shadowScale, shadowScale * 0.5);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw helicopter body
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(heli.angle);

    // Scale based on altitude (smaller than planes)
    const altitudeScale = 0.5 + heli.altitude * 0.3;
    ctx.scale(altitudeScale, altitudeScale);

    // Main body - oval/teardrop shape
    ctx.fillStyle = heli.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit bubble (front)
    ctx.fillStyle = '#87ceeb'; // Light blue glass
    ctx.beginPath();
    ctx.ellipse(5, 0, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail boom
    ctx.fillStyle = heli.color;
    ctx.beginPath();
    ctx.moveTo(-6, -1);
    ctx.lineTo(-16, -0.5);
    ctx.lineTo(-16, 0.5);
    ctx.lineTo(-6, 1);
    ctx.closePath();
    ctx.fill();

    // Tail rotor (vertical)
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(-15, 0, 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Landing skids
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Left skid
    ctx.moveTo(-4, 3.5);
    ctx.lineTo(4, 3.5);
    ctx.moveTo(-2, 4);
    ctx.lineTo(-2, 6);
    ctx.lineTo(2, 6);
    ctx.lineTo(2, 4);
    // Right skid
    ctx.moveTo(-4, -3.5);
    ctx.lineTo(4, -3.5);
    ctx.moveTo(-2, -4);
    ctx.lineTo(-2, -6);
    ctx.lineTo(2, -6);
    ctx.lineTo(2, -4);
    ctx.stroke();

    // Navigation lights at night (hour >= 20 || hour < 6)
    const isNight = hour >= 20 || hour < 6;
    if (isNight) {
      const strobeOn = Math.sin(navLightFlashTimer * 8) > 0.82; // Sharp, brief flash

      // Red nav light on port (left) side
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Green nav light on starboard (right) side
      ctx.fillStyle = '#33ff33';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Red anti-collision beacon on tail (flashing) - BRIGHT
      if (strobeOn) {
        // Draw multiple layers for intense brightness
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(-14, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        // Inner bright core
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-14, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Draw main rotor (drawn separately so it's always on top)
    ctx.save();
    ctx.translate(heli.x, heli.y);

    // Rotor hub
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(0, 0, 2 * altitudeScale, 0, Math.PI * 2);
    ctx.fill();

    // Rotor blades (spinning effect - draw as blurred disc)
    const rotorRadius = 12 * altitudeScale;
    ctx.strokeStyle = `rgba(100, 100, 100, ${0.4 + Math.sin(heli.rotorAngle * 4) * 0.1})`;
    ctx.lineWidth = 1.5 * altitudeScale;
    ctx.beginPath();
    ctx.arc(0, 0, rotorRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw rotor blade lines (2 blades, rotating)
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.6)';
    ctx.lineWidth = 1.5 * altitudeScale;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(heli.rotorAngle) * rotorRadius,
      Math.sin(heli.rotorAngle) * rotorRadius
    );
    ctx.lineTo(
      Math.cos(heli.rotorAngle + Math.PI) * rotorRadius,
      Math.sin(heli.rotorAngle + Math.PI) * rotorRadius
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(heli.rotorAngle + Math.PI / 2) * rotorRadius,
      Math.sin(heli.rotorAngle + Math.PI / 2) * rotorRadius
    );
    ctx.lineTo(
      Math.cos(heli.rotorAngle + Math.PI * 1.5) * rotorRadius,
      Math.sin(heli.rotorAngle + Math.PI * 1.5) * rotorRadius
    );
    ctx.stroke();

    ctx.restore();
  }
}
