import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows, Text, Float } from "@react-three/drei";
import * as THREE from "three";

const departments = ["Sneakers","Men's Fashion","Women's Fashion","Watches","Eyewear","Luxury Bags","Jewellery","Streetwear","Sportswear","Denim","Beauty","Accessories","Electronics","Home Decor","New Arrivals"];
const accents = ["#d7b47b","#9db7ff","#e6a6b7","#c5b8a2","#9bd4d2","#d5b2f2","#e7cc83","#a4b6a8","#8fc6e8","#b4a1d5","#e8a78c","#b8c7d9","#8ca9c7","#c8b69a","#e5d1a3"];

function Podium({ name, index, position, active, onSelect }) {
  const ref = useRef();
  const accent = accents[index];
  useFrame((_, dt) => {
    if (ref.current) ref.current.scale.lerp(new THREE.Vector3(active ? 1.12 : 1, active ? 1.12 : 1, active ? 1.12 : 1), Math.min(1, dt * 5));
  });
  return <group ref={ref} position={position}
    onClick={e => { e.stopPropagation(); onSelect(index); }}
    onPointerOver={() => { document.body.style.cursor = "pointer"; }}
    onPointerOut={() => { document.body.style.cursor = "auto"; }}>
    <mesh position={[0,.2,0]} castShadow><cylinderGeometry args={[1.05,1.16,.4,48]}/><meshStandardMaterial color={active ? accent : "#252a34"} metalness={.85} roughness={.23} emissive={accent} emissiveIntensity={active ? .3 : .035}/></mesh>
    <mesh position={[0,.44,0]}><cylinderGeometry args={[.96,.96,.06,48]}/><meshStandardMaterial color="#11151d" metalness={.7}/></mesh>
    <mesh position={[0,1.2,0]} castShadow><boxGeometry args={[.82,1.45,.72]}/><meshStandardMaterial color="#343b48" metalness={.78} roughness={.24}/></mesh>
    <mesh position={[0,1.96,0]}><boxGeometry args={[.98,.1,.86]}/><meshStandardMaterial color={accent} metalness={.8} emissive={accent} emissiveIntensity={active ? .5 : .12}/></mesh>
    <Float speed={1.4} floatIntensity={.18} rotationIntensity={.12}>
      <mesh position={[0,2.55,0]} castShadow>
        {index % 3 === 0 ? <torusKnotGeometry args={[.32,.1,80,12]}/> : index % 3 === 1 ? <icosahedronGeometry args={[.4,1]}/> : <octahedronGeometry args={[.44,0]}/>}
        <meshStandardMaterial color={accent} metalness={.8} roughness={.2}/>
      </mesh>
    </Float>
    <Text position={[0,3.18,0]} fontSize={.24} maxWidth={2.7} textAlign="center" anchorX="center" anchorY="middle" color={active ? accent : "#f2eee7"} outlineWidth={.012} outlineColor="#080a0f">{name.toUpperCase()}</Text>
    <pointLight position={[0,2.5,0]} color={accent} intensity={active ? 5 : 1} distance={4}/>
  </group>;
}

function Scene({ selected, onSelect, controls }) {
  const positions = useMemo(() => departments.map((_, i) => {
    const a = i / departments.length * Math.PI * 2;
    return [Math.cos(a) * 9.2, 0, Math.sin(a) * 9.2];
  }), []);
  return <>
    <color attach="background" args={["#080a0f"]}/><fog attach="fog" args={["#080a0f",17,34]}/>
    <ambientLight intensity={.75}/>
    <spotLight position={[0,16,2]} angle={.7} penumbra={.8} intensity={170} castShadow/>
    <pointLight position={[-10,6,-4]} color="#6488ff" intensity={25} distance={24}/>
    <pointLight position={[10,6,4]} color="#d4a66d" intensity={28} distance={24}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]} receiveShadow><circleGeometry args={[16,96]}/><meshStandardMaterial color="#171b23" metalness={.72} roughness={.25}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.1,0]}><ringGeometry args={[5.2,5.34,96]}/><meshBasicMaterial color="#b99a70"/></mesh>
    <mesh position={[0,1.75,0]}><cylinderGeometry args={[1.85,2.25,3.5,64,1,true]}/><meshStandardMaterial color="#252b36" metalness={.9} roughness={.18} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,3.65,0]}><torusGeometry args={[2.05,.075,16,96]}/><meshStandardMaterial color="#d2b17d" metalness={.9} emissive="#8c6c3e" emissiveIntensity={.3}/></mesh>
    <Float speed={.7} floatIntensity={.12}><mesh position={[0,4.45,0]} scale={.78} rotation={[.2,.4,.1]}><torusKnotGeometry args={[1.1,.12,140,18]}/><meshStandardMaterial color="#d1b17f" metalness={.88} roughness={.18}/></mesh></Float>
    <Text position={[0,5.35,0]} fontSize={.58} color="#f4eee4" anchorX="center">NOIR</Text>
    <Text position={[0,4.98,0]} fontSize={.14} color="#c5a779" anchorX="center" letterSpacing={.18}>THE DIGITAL FLAGSHIP</Text>
    {Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return <group key={i} position={[Math.cos(a)*13.4,0,Math.sin(a)*13.4]}><mesh position={[0,2.3,0]} castShadow><boxGeometry args={[.42,4.6,.55]}/><meshStandardMaterial color="#555d6b" metalness={.9}/></mesh><mesh position={[0,4.65,0]}><boxGeometry args={[.62,.08,.72]}/><meshStandardMaterial color="#c5a779" emissive="#9d7846" emissiveIntensity={.25}/></mesh></group>})}
    {departments.map((name,i)=><Podium key={name} name={name} index={i} position={positions[i]} active={selected===i} onSelect={onSelect}/>)}
    <ContactShadows position={[0,-.08,0]} opacity={.4} scale={34} blur={2.8} far={8}/>
    <Environment preset="city"/>
  </>;
}

function CameraMotion({ selected, controls }) {
  const destination = useRef(new THREE.Vector3(0,9,17));
  const lookAt = useRef(new THREE.Vector3(0,1.2,0));
  useEffect(() => {
    if (selected === null) { destination.current.set(0,12,23); lookAt.current.set(0,1.5,0); }
    else {
      const a = selected / departments.length * Math.PI * 2;
      const x = Math.cos(a)*9.2, z = Math.sin(a)*9.2;
      destination.current.set(x*1.48,6.8,z*1.48);
      lookAt.current.set(x,1.5,z);
    }
  }, [selected]);
  useFrame(({camera},dt) => {
    camera.position.lerp(destination.current,1-Math.exp(-dt*1.8));
    if (controls.current) { controls.current.target.lerp(lookAt.current,1-Math.exp(-dt*2)); controls.current.update(); }
  });
  return null;
}

export default function MallScene({ onDepartmentSelect }) {
  const [selected,setSelected] = useState(null);
  const chooseDepartment = index => { setSelected(index); onDepartmentSelect?.(departments[index]); };
  const resetAtrium = () => { setSelected(null); onDepartmentSelect?.(null); };
  const controls = useRef();
  return <div className="scene-shell">
    <Canvas shadows dpr={[1,1.5]} camera={{position:[0,12,23],fov:52}}>
      <Suspense fallback={null}>
        <Scene selected={selected} onSelect={chooseDepartment} controls={controls}/>
        <CameraMotion selected={selected} controls={controls}/>
        <OrbitControls ref={controls} enablePan={false} minDistance={7} maxDistance={25} maxPolarAngle={Math.PI/2.05} minPolarAngle={.18}/>
      </Suspense>
    </Canvas>
    <div className="scene-overlay">
      <div className="scene-title"><span className="scene-kicker">NOIR / VIRTUAL FLAGSHIP</span><strong>{selected===null ? "Explore the mall" : departments[selected]}</strong><span>{selected===null ? "Select any department display to explore." : "Department selected · choose another or return to the atrium."}</span></div>
      {selected!==null && <button className="scene-reset" onClick={resetAtrium}>← MAIN ATRIUM</button>}
    </div>
    <div className="scene-hint">CLICK A DEPARTMENT · DRAG TO ORBIT · SCROLL TO ZOOM</div>
  </div>;
}
