import bevy_pbr::render::forward_io::VertexOutput;

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> water_clock: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var<uniform> boat_pose: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var<uniform> float_pose: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(3) var<uniform> ripple_a: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(4) var<uniform> ripple_b: vec4<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(5) var<uniform> ripple_c: vec4<f32>;

fn passing_wake(p: vec2<f32>, w: vec4<f32>) -> f32 {
  let r=length((p-w.xy)*vec2<f32>(.86,1.0));
  return exp(-54.0*abs(r-(.64+w.z*.49)))*exp(-1.5*w.z)*min(1.0,w.w*21.0);
}

fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p,vec2<f32>(127.1,311.7)))*43758.5453);
}
fn noise(p: vec2<f32>) -> f32 {
  let cell=floor(p);
  let f=fract(p);
  let u=f*f*(3.0-2.0*f);
  return mix(mix(hash(cell),hash(cell+vec2<f32>(1,0)),u.x),
             mix(hash(cell+vec2<f32>(0,1)),hash(cell+vec2<f32>(1,1)),u.x),u.y);
}

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
  let p=in.world_position.xz;
  let t=water_clock.x;
  let gold=water_clock.y;
  let swell=noise(p*1.9+vec2<f32>(.10*t,-.16*t));
  let crosswave=noise(p*3.8+vec2<f32>(-.20*t,.12*t));
  let large=noise(p*.42+vec2<f32>(t*.018,0));
  let streak=sin(p.y*38.0+p.x*12.0 + swell*17.0 + crosswave*7.0 + 1.4*sin(p.x*13.0+p.y*7.0+t*.63) - t*2.4);
  let small=noise(vec2<f32>(p.x*11.0,p.y*22.0)+vec2<f32>(-.53*t,.41*t));
  let glint=smoothstep(.68,.98,streak)*smoothstep(.26,.62,small)*smoothstep(.70,.86,swell*.63+crosswave*.27+small*.10);
  let lace=pow(max(0.0,streak),9.0)*smoothstep(.45,.78,crosswave)*.06;
  let d=p-boat_pose.xy;
  let dir=vec2<f32>(cos(boat_pose.z),-sin(boat_pose.z));
  let boat=vec2<f32>(dot(d,dir),dot(d,vec2<f32>(-dir.y,dir.x)));
  let h=length(boat/vec2<f32>(1.78,.70));
  let edge=exp(-22.0*abs(h-1.04))*(.25+.75*smoothstep(.22,.64,small));
  let trail=max(-boat.x,0.0);
  let spread=.5+.22*trail;
  let wake=exp(-19.0*abs(abs(boat.y)-spread)) * smoothstep(.9,1.65,trail) * exp(-.43*trail) * boat_pose.w * (.3+.7*small);
  let fd=length(p-float_pose.xy);
  let rings=pow(.5+.5*cos(fd*34.0-t*5.7),10.0)*exp(-3.8*fd)*float_pose.z;
  let trailing=(passing_wake(p,ripple_a)+passing_wake(p,ripple_b)+passing_wake(p,ripple_c))*(.1+.6*small);
  let shine=clamp(glint+lace+edge*.33+wake+rings*.76+trailing,0.,1.);
  let tint=mix(vec3<f32>(.001,.068,.084),vec3<f32>(.003,.212,.204),large);
  let sunset=gold*clamp(.15+.71*smoothstep(-2.7,2.9,p.x-boat_pose.x)+.32*noise(p*.22-vec2<f32>(0.,t*.012)),0.,1.);
  let water=mix(tint,vec3<f32>(.46,.195,.065),sunset*.86);
  let foam=mix(vec3<f32>(1.32,1.45,1.37),vec3<f32>(1.76,1.28,.68),sunset);
  return vec4<f32>(mix(water,foam,shine), clamp(.42+.17*swell+.52*shine,.21,.94));
}
