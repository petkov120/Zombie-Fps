import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

/** Served from public/ — exact path */
const ZOMBIE_IDLE_URL = '/assets/zombie/Zombie Idle.fbx'

export default function GameScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      500
    )
    camera.position.set(0, 1.6, 4)
    camera.lookAt(0, 0.9, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(4, 12, 6)
    sun.castShadow = true
    scene.add(sun)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x355236, roughness: 0.9 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const clock = new THREE.Clock()
    let mixer = null
    let rafId = 0

    const loader = new FBXLoader()
    loader.load(
      ZOMBIE_IDLE_URL,
      (fbx) => {
        fbx.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        const box = new THREE.Box3().setFromObject(fbx)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 0.001)
        const targetHeight = 1.85
        const s = targetHeight / maxDim
        fbx.scale.setScalar(s)

        box.setFromObject(fbx)
        const center = box.getCenter(new THREE.Vector3())
        fbx.position.sub(center)
        fbx.position.y = 0

        scene.add(fbx)

        if (fbx.animations.length > 0) {
          mixer = new THREE.AnimationMixer(fbx)
          mixer.clipAction(fbx.animations[0]).play()
        }
      },
      undefined,
      (err) => {
        console.error('Failed to load FBX:', err)
      }
    )

    function onResize() {
      const w = mount.clientWidth
      const h = Math.max(mount.clientHeight, 1)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    function tick() {
      rafId = requestAnimationFrame(tick)
      const dt = clock.getDelta()
      if (mixer) mixer.update(dt)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafId)
      if (mixer) mixer.stopAllAction()

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        const mats = obj.material
        if (mats) {
          const list = Array.isArray(mats) ? mats : [mats]
          list.forEach((m) => m.dispose?.())
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  )
}
