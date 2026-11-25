import bevy_pbr::render::forward_io::VertexOutput;

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> water_clock: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var<uniform> boat_pose: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var<uniform> float_pose: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(3) var<uniform> ripple_a: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(4) var<uniform> ripple_b: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(5) var<uniform> ripple_c: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(6) var<uniform> otter_pose: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(7) var<uniform> lantern_pose: vec4<f32>;

fn hash21(p: vec2<f32>) -> f32 {
  let p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  let p3b = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3b.x + p3b.y) * p3b.z);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
  let n = sin(vec2<f32>(dot(p, vec2<f32>(127.1, 311.7)), dot(p, vec2<f32>(269.5, 183.3))));
  return fract(n * 43758.5453);
}

fn noise(p: vec2<f32>) -> f32 {
  let cell = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(cell), hash21(cell + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash21(cell + vec2<f32>(0.0, 1.0)), hash21(cell + vec2<f32>(1.0, 1.0)), u.x),
    u.y,
  );
}

fn fbm(p: vec2<f32>) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var q = p;
  for (var i = 0; i < 3; i++) {
    v += a * noise(q);
    q = mat2x2<f32>(1.6, 1.2, -1.2, 1.6) * q;
    a *= 0.5;
  }
  return v;
}

// Delicate underwater caustics net
fn caustic_net(p: vec2<f32>, t: f32) -> f32 {
  let g = floor(p);
  let f = fract(p);
  var d1 = 8.0;
  var d2 = 8.0;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let o = vec2<f32>(f32(i), f32(j));
      let rnd = hash22(g + o);
      let pt = o + 0.5 + 0.36 * sin(t * 0.9 + 6.2831 * rnd);
      let dist = length(pt - f);
      if (dist < d1) {
        d2 = d1;
        d1 = dist;
      } else if (dist < d2) {
        d2 = dist;
      }
    }
  }
  return pow(1.0 - smoothstep(0.0, 0.22, d2 - d1), 2.5);
}

// Occasional crisp 4-point star sparkles twinkling across the sunlit surface
fn star_sparkle(p: vec2<f32>, t: f32) -> f32 {
  let cell = floor(p);
  let f = fract(p) - 0.5;
  let rnd = hash22(cell);
  let center = (rnd - 0.5) * 0.55;
  let d = f - center;
  let phase = sin(t * (2.2 + rnd.x * 2.5) + rnd.y * 6.2831);
  let on = smoothstep(0.76, 0.99, phase) * step(0.62, hash21(cell + 17.3));
  let core = exp(-length(d) * 26.0);
  let cross_arm = exp(-abs(d.x) * 58.0) * exp(-abs(d.y) * 9.0)
    + exp(-abs(d.y) * 58.0) * exp(-abs(d.x) * 9.0);
  return on * clamp(core + cross_arm * 0.65, 0.0, 1.0);
}

fn basin_depth(p: vec2<f32>) -> f32 {
  let h = -1.12
    + 0.28 * sin(p.x * 0.42 + p.y * 0.18)
    + 0.22 * cos(p.y * 0.52 - p.x * 0.21)
    + 0.14 * sin(p.x * 1.15 - p.y * 0.65)
    - 0.18 * exp(-dot(p - vec2<f32>(0.5, 0.8), p - vec2<f32>(0.5, 0.8)) * 0.035);
  return clamp(-h, 0.22, 2.2);
}

// Stylized curved graphic ripple arcs trailing behind boat & otter
fn passing_wake(p: vec2<f32>, w: vec4<f32>) -> f32 {
  if (w.w < 0.002) {
    return 0.0;
  }
  let rel = p - w.xy;
  let r = length(rel * vec2<f32>(0.88, 1.0));
  let ring = exp(-52.0 * abs(r - (0.55 + w.z * 0.52))) * exp(-1.2 * w.z);
  let arc_mask = smoothstep(-0.2, 0.55, sin(atan2(rel.y, rel.x) * 2.0 + w.z * 2.0));
  return ring * (0.45 + 0.55 * arc_mask) * min(1.0, w.w * 26.0);
}

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
  let p = in.world_position.xz;
  let t = water_clock.x;
  let gold = water_clock.y;
  let splash_t = water_clock.z; // 0..1 active splash burst when fish leaps/strikes

  let depth = basin_depth(p);
  let depth_t = smoothstep(0.45, 1.65, depth);

  // Organic warped swell fields (for clustered painterly specular blobs, NOT uniform stripes!)
  let warp = vec2<f32>(
    fbm(p * 0.72 + vec2<f32>(0.14 * t, -0.10 * t)),
    fbm(p * 0.78 + vec2<f32>(-0.11 * t, 0.15 * t) + vec2<f32>(5.2, 1.3)),
  );
  let swell = fbm(p * 1.05 + warp * 1.15 + vec2<f32>(0.08 * t, -0.12 * t));
  let micro = noise(p * 4.2 + warp * 2.2 + vec2<f32>(-0.35 * t, 0.28 * t));

  // Clustered sunlit liquid specular flecks (discrete crisp organic patches concentrated in sunlit reflection zones, leaving 85%+ of the emerald water crystal-clear!)
  let sun_rel_a = (p - boat_pose.xy - vec2<f32>(0.9, -2.5)) * vec2<f32>(0.34, 0.46);
  let sun_rel_b = (p - boat_pose.xy - vec2<f32>(-3.4, 2.3)) * vec2<f32>(0.40, 0.48);
  let sun_zone = clamp(exp(-dot(sun_rel_a, sun_rel_a)) + 0.72 * exp(-dot(sun_rel_b, sun_rel_b)), 0.0, 1.0);
  let scatter_zone = smoothstep(0.62, 0.80, fbm(p * 0.36 - vec2<f32>(t * 0.04, t * 0.03))) * 0.42;
  let zone_mask = clamp(sun_zone + scatter_zone, 0.0, 1.0);

  let fleck_a = fbm(vec2<f32>(p.x * 2.6, p.y * 6.2) + warp * 2.2 + vec2<f32>(0.18 * t, -0.26 * t));
  let fleck_b = noise(vec2<f32>(p.x * 5.8, p.y * 12.5) + warp * 1.9 + vec2<f32>(-0.34 * t, 0.24 * t));
  let fleck_val = fleck_a * (0.58 + 0.42 * fleck_b) * (0.45 + 0.75 * zone_mask);
  let liquid_glint = smoothstep(0.56, 0.65, fleck_val) * smoothstep(0.18, 0.45, zone_mask);

  // Occasional crisp 4-point star sparkles
  let sparkle = star_sparkle(p * 0.65 + vec2<f32>(0.025 * t, -0.02 * t), t) * (0.85 - 0.30 * gold);

  // Delicate underwater caustics (subtle so jewel emerald seabed stays crisp!)
  let caust_uv = p * 1.12 + warp * 0.55 + vec2<f32>(0.06 * t, -0.05 * t);
  let caustics = caustic_net(caust_uv, t * 0.88) * (1.0 - 0.52 * depth_t);

  // Boat hull crisp graphic crescent outline + stern wake arcs
  let d = p - boat_pose.xy;
  let dir = vec2<f32>(cos(boat_pose.z), -sin(boat_pose.z));
  let boat = vec2<f32>(dot(d, dir), dot(d, vec2<f32>(-dir.y, dir.x)));
  let bow_taper = mix(1.0, 0.42, smoothstep(0.2, 1.85, boat.x));
  let hull_d = length(vec2<f32>(boat.x / 1.84, boat.y / (0.72 * bow_taper)));
  // Crisp thin stylized crescent foam hugging the skiff waterline
  let hull_rim = exp(-42.0 * abs(hull_d - 1.04)) * smoothstep(0.24, 0.58, micro);
  let stern_arc = exp(-46.0 * abs(hull_d - 1.24)) * smoothstep(0.1, -0.9, boat.x) * 0.75;

  let trail = max(-boat.x, 0.0);
  let spread = 0.48 + 0.24 * trail;
  let wake_arm = exp(-28.0 * abs(abs(boat.y) - spread))
    * smoothstep(0.85, 1.55, trail) * exp(-0.42 * trail) * boat_pose.w;
  let wake = wake_arm * (0.45 + 0.55 * micro);

  // Bobber crisp graphic concentric ripple arcs + fish leap splash burst
  let fd_vec = p - float_pose.xy;
  let fd = length(fd_vec);
  let fd_ang = atan2(fd_vec.y, fd_vec.x);
  let bite_boost = float_pose.w;
  let ring_wave = sin(fd * mix(22.0, 28.0, bite_boost) - t * mix(4.8, 9.0, bite_boost));
  let arc_break = smoothstep(-0.35, 0.35, sin(fd_ang * 3.0 + fd * 4.0 - t * 1.4));
  let rings = smoothstep(0.76, 0.94, ring_wave) * arc_break * exp(-2.8 * fd) * float_pose.z * (0.85 + 0.35 * bite_boost);

  // Dramatic graphic white splash burst ring on fish leap / strike!
  let sp_r = 0.16 + splash_t * 0.72;
  let sp_ring = exp(-30.0 * abs(fd - sp_r)) * (1.0 - splash_t) * step(0.001, splash_t)
    * (0.45 + 0.55 * smoothstep(0.18, 0.65, sin(fd_ang * 7.0 + micro * 5.0)));
  let sp_outer = exp(-44.0 * abs(fd - (sp_r + 0.28))) * (1.0 - splash_t) * step(0.001, splash_t) * 0.72;

  // Active fighting fish surface swirl rings trailing behind the darting fish during reel
  let fight_ring = smoothstep(0.74, 0.94, sin(fd * 24.0 - t * 11.0)) * arc_break
    * exp(-1.9 * fd) * step(0.5, bite_boost) * 0.85;

  // Back-floating companion otter crisp white halo ripple
  let od = p - otter_pose.xy;
  let o_dist = length(od);
  let o_ang = atan2(od.y, od.x);
  let otter_rim = exp(-48.0 * abs(o_dist - 0.36)) * (0.45 + 0.55 * smoothstep(-0.2, 0.5, sin(o_ang * 2.0 + t * 1.5))) * 0.72;
  let otter_ring = smoothstep(0.80, 0.95, sin(o_dist * 20.0 - t * 3.8)) * exp(-3.4 * o_dist) * smoothstep(0.32, 0.45, o_dist) * 0.45;

  let trailing = (passing_wake(p, ripple_a) + passing_wake(p, ripple_b) + passing_wake(p, ripple_c));

  // === SIGNATURE PALETTE ===
  // Day: deep rich jewel emerald-teal (high clarity, zero milkiness!)
  let day_shallow = vec3<f32>(0.014, 0.245, 0.228);
  let day_deep = vec3<f32>(0.004, 0.118, 0.155);
  let day_tint = mix(day_shallow, day_deep, depth_t * 0.75 + swell * 0.25);

  // Dusk: cool deep twilight indigo-teal (NOT muddy brown!) so warm lantern gold POPS!
  let dusk_shallow = vec3<f32>(0.032, 0.135, 0.185);
  let dusk_deep = vec3<f32>(0.025, 0.072, 0.145);
  let dusk_tint = mix(dusk_shallow, dusk_deep, depth_t * 0.78 + swell * 0.22);

  let base_tint = mix(day_tint, dusk_tint, gold);

  // Warm golden oil-lantern reflection pool radiating across the water from the bow!
  let l_dist = length(p - lantern_pose.xy);
  let lantern_pool = exp(-l_dist * 0.48) * lantern_pose.z;
  let lantern_core = exp(-l_dist * 1.15) * lantern_pose.z;
  let warm_glow = vec3<f32>(0.92, 0.56, 0.16) * lantern_pool * 0.52
    + vec3<f32>(1.25, 0.78, 0.28) * lantern_core * 0.45;

  // Delicate underwater caustic shimmer
  let caustic_col = mix(vec3<f32>(0.18, 0.62, 0.52), vec3<f32>(0.65, 0.52, 0.26), gold * 0.75);
  var col = base_tint + caustic_col * caustics * 0.18 + warm_glow;

  // Crisp graphic white/gold foam lines & clustered liquid specular highlights
  let line_amt = clamp(hull_rim * 0.72 + stern_arc * 0.52 + wake + rings + fight_ring + sp_ring + sp_outer + trailing + otter_rim + otter_ring, 0.0, 1.0);
  let glint_amt = clamp(liquid_glint * 0.96 + sparkle * 1.15, 0.0, 1.0);

  let line_col = mix(vec3<f32>(0.94, 1.00, 0.98), vec3<f32>(1.08, 0.94, 0.72), clamp(gold * 0.6 + lantern_pool, 0.0, 1.0));
  let glint_col = mix(vec3<f32>(1.38, 1.46, 1.42), vec3<f32>(1.78, 1.42, 0.76), clamp(gold * 0.85 + lantern_pool * 0.5, 0.0, 1.0));

  col = mix(col, line_col, line_amt * 0.88);
  col = mix(col, glint_col, glint_amt);

  // Crystal-clear jewel transparency: lets emerald riverbed, coral & bright orange fish shine through!
  let water_alpha = mix(0.18, 0.38, depth_t) + 0.05 * swell + lantern_pool * 0.16;
  let alpha = clamp(water_alpha + line_amt * 0.55 + glint_amt * 0.68, 0.16, 0.96);
  return vec4<f32>(col, alpha);
}
