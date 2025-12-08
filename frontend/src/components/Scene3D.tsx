/**
 * 3D Scene Component
 * 
 * Real-time 3D visualization of vehicle orientation using Three.js
 * Renders a drone/vehicle model that rotates based on sensor data
 */

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { SensorData } from '../types/sensor'

interface Scene3DProps {
  sensorData: SensorData
}

/**
 * Drone/Vehicle 3D Model
 */
function VehicleModel({ orientation }: { orientation: SensorData['orientation'] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Update orientation based on sensor data
  useFrame(() => {
    if (groupRef.current) {
      // Apply quaternion rotation from sensor data
      const quaternion = new THREE.Quaternion(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w
      )
      
      groupRef.current.quaternion.copy(quaternion)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main Body - Elongated box representing drone/vehicle */}
      <mesh castShadow>
        <boxGeometry args={[2, 0.3, 1]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Front Indicator - Red cone */}
      <mesh position={[1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial
          color="#ff3366"
          emissive="#ff3366"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Arms - 4 extending arms for drone rotors */}
      {[
        [0.8, 0, 0.4],
        [0.8, 0, -0.4],
        [-0.8, 0, 0.4],
        [-0.8, 0, -0.4],
      ].map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          {/* Arm */}
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
            <meshStandardMaterial
              color="#1a1a24"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
          {/* Rotor */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={0.2}
              metalness={0.7}
              roughness={0.3}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Center LED indicator */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ffaa00"
          emissiveIntensity={1}
        />
        <pointLight color="#ffaa00" intensity={0.5} distance={2} />
      </mesh>

      {/* Axis indicators for debugging */}
      {/* X-axis (Red) */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0xff0000]} />
      {/* Y-axis (Green) */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x00ff00]} />
      {/* Z-axis (Blue) */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1.5, 0x0000ff]} />
    </group>
  )
}

/**
 * Scene lighting and environment
 */
function SceneLighting() {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} />
      
      {/* Main directional light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* Fill lights */}
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#00d4ff" />
      <pointLight position={[5, 3, -5]} intensity={0.3} color="#ff00ff" />
      
      {/* Rim light */}
      <spotLight
        position={[0, 5, 0]}
        angle={0.5}
        penumbra={0.5}
        intensity={0.5}
        color="#00ff88"
      />
    </>
  )
}

/**
 * Reference grid and coordinate system
 */
function ReferenceGrid() {
  return (
    <>
      {/* Ground grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#00d4ff"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00ff88"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
      
      {/* Coordinate axes labels */}
      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      <mesh position={[0, 0, 2]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
    </>
  )
}

/**
 * Main Scene3D Component
 */
function Scene3D({ sensorData }: Scene3DProps) {
  return (
    <div className="scene-container">
      <Canvas
        shadows
        className="canvas-3d"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[5, 3, 5]} fov={50} />

        {/* Scene lighting */}
        <SceneLighting />

        {/* Vehicle model with live orientation */}
        <VehicleModel orientation={sensorData.orientation} />

        {/* Reference grid */}
        <ReferenceGrid />

        {/* Orbit controls for user interaction */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Background color */}
        <color attach="background" args={['#0a0a0f']} />
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#0a0a0f', 10, 30]} />
      </Canvas>

      {/* Axis labels overlay */}
      <div className="axis-labels">
        <div className="axis-label axis-x">X (Roll)</div>
        <div className="axis-label axis-y">Y (Pitch)</div>
        <div className="axis-label axis-z">Z (Yaw)</div>
      </div>

      
    </div>
  )
}

export default Scene3D