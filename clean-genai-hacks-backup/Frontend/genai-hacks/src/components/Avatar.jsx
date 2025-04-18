// /*
//   Adapted from your two code snippets to work with a single-mesh model:
//   therapist_avatar.glb (Wolf3D_Avatar) + animations.glb
// */

// import React, { useEffect, useRef, useState } from "react";
// import { useFrame } from "@react-three/fiber";
// import { useAnimations, useGLTF } from "@react-three/drei";
// import { button, useControls } from "leva";
// import * as THREE from "three";
// import { useChat } from "./hooks/useChat";

// // --------------------------------------
// // Facial Expressions & Viseme Mappings
// // --------------------------------------
// const facialExpressions = {
//   default: {},
//   smile: {
//     browInnerUp: 0.17,
//     eyeSquintLeft: 0.4,
//     eyeSquintRight: 0.44,
//     noseSneerLeft: 0.17,
//     noseSneerRight: 0.14,
//     mouthPressLeft: 0.61,
//     mouthPressRight: 0.41,
//   }
// };

// const corresponding = {
//   A: "viseme_PP",
//   B: "viseme_kk",
//   C: "viseme_I",
//   D: "viseme_AA",
//   E: "viseme_O",
//   F: "viseme_U",
//   G: "viseme_FF",
//   H: "viseme_TH",
//   X: "viseme_PP",
// };

// // We'll toggle this at runtime when you click "enableSetupMode" or "disableSetupMode"
// let setupMode = false;

// export function Avatar(props) {
//   // 1) Load main model (therapist_avatar.glb)
//   const { nodes, materials, scene } = useGLTF("/models/therapist_avatar.glb");
//   // 2) Load your animations from animations.glb
//   const { animations } = useGLTF("/models/animations.glb");

//   // 3) Set up references and states
//   const group = useRef();
//   const { actions, mixer } = useAnimations(animations, group);

//   // Access your chat hook (for incoming messages with text, audio, lip sync data)
//   const { message, onMessagePlayed, chat } = useChat();

//   const [animation, setAnimation] = useState(
//     animations.find((a) => a.name === "Idle") ? "Idle" : animations[0]?.name
//   );
//   const [facialExpression, setFacialExpression] = useState("default");
//   const [lipsync, setLipsync] = useState(null);
//   const [audio, setAudio] = useState(null);

//   const [blink, setBlink] = useState(false);
//   const [winkLeft, setWinkLeft] = useState(false);
//   const [winkRight, setWinkRight] = useState(false);

//   // 4) On new incoming message, update states and play audio
//   useEffect(() => {
//     if (!message) {
//       // No new message: default animation
//       setAnimation("Idle");
//       return;
//     }
//     setAnimation(message.animation || "Idle");
//     setFacialExpression(message.facialExpression || "default");
//     setLipsync(message.lipsync || null);

//     // Play base64 MP3 from message
//     if (message.audio) {
//       const newAudio = new Audio("data:audio/mp3;base64," + message.audio);
//       newAudio.play();
//       setAudio(newAudio);
//       newAudio.onended = onMessagePlayed;
//     }
//   }, [message]);

//   // 5) Handle animations (Mixamo). Fade in/out.
//   useEffect(() => {
//     if (!actions || !animation) return;
//     const current = actions[animation];
//     if (!current) return;

//     current
//       .reset()
//       .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
//       .play();

//     // Fade out previous on unmount
//     return () => {
//       current.fadeOut(0.5);
//     };
//   }, [animation, actions, mixer]);

//   // 6) Function to smoothly set a morph target by name
//   const lerpMorphTarget = (targetName, targetValue, speed = 0.1) => {
//     scene.traverse((child) => {
//       if (child.isSkinnedMesh && child.morphTargetDictionary) {
//         const index = child.morphTargetDictionary[targetName];
//         if (index === undefined) return;

//         const currentValue = child.morphTargetInfluences[index];
//         if (currentValue === undefined) return;

//         child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
//           currentValue,
//           targetValue,
//           speed
//         );

//         // Update the Leva slider in real-time only if not in setupMode
//         if (!setupMode) {
//           try {
//             setLevaState({ [targetName]: targetValue });
//           } catch (e) {
//             // no-op
//           }
//         }
//       }
//     });
//   };

//   // 7) On every frame, apply facial expressions and lip sync
//   useFrame(() => {
//     // Skip if we're in setupMode (so you can tweak morph targets manually)
//     if (setupMode) return;

//     // 7a) Apply facial expression
//     const expressionData = facialExpressions[facialExpression] || {};
//     Object.keys(nodes.Wolf3D_Avatar.morphTargetDictionary).forEach((key) => {
//       // Eye blinks/winks are handled separately below
//       if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;

//       const wantedValue = expressionData[key] || 0;
//       lerpMorphTarget(key, wantedValue, 0.1);
//     });

//     // 7b) Blink / Wink
//     const blinkOrWinkLeft = blink || winkLeft ? 1 : 0;
//     const blinkOrWinkRight = blink || winkRight ? 1 : 0;
//     lerpMorphTarget("eyeBlinkLeft", blinkOrWinkLeft, 0.5);
//     lerpMorphTarget("eyeBlinkRight", blinkOrWinkRight, 0.5);

//     // 7c) Lip Sync
//     if (message && lipsync && audio) {
//       const currentAudioTime = audio.currentTime;
//       let foundViseme = null;
//       // Find which mouthCue is active based on audio time
//       for (let i = 0; i < lipsync.mouthCues.length; i++) {
//         const cue = lipsync.mouthCues[i];
//         if (currentAudioTime >= cue.start && currentAudioTime <= cue.end) {
//           foundViseme = cue.value; // e.g. "A", "B", ...
//           break;
//         }
//       }

//       // If we found a viseme, set it to 1, else 0
//       const targetName = corresponding[foundViseme];
//       if (targetName) {
//         // Lerp that morph target up
//         lerpMorphTarget(targetName, 1, 0.2);
//       }

//       // Lerp all other visemes down
//       Object.values(corresponding).forEach((viseme) => {
//         if (viseme !== targetName) {
//           lerpMorphTarget(viseme, 0, 0.1);
//         }
//       });
//     } else {
//       // If no lipsync or no audio, set all visemes to 0
//       Object.values(corresponding).forEach((viseme) => {
//         lerpMorphTarget(viseme, 0, 0.1);
//       });
//     }
//   });

//   // 8) Simple random blinking
//   useEffect(() => {
//     let blinkTimeout;
//     const nextBlink = () => {
//       blinkTimeout = setTimeout(() => {
//         setBlink(true);
//         setTimeout(() => {
//           setBlink(false);
//           nextBlink();
//         }, 200);
//       }, THREE.MathUtils.randInt(1000, 5000));
//     };
//     nextBlink();
//     return () => clearTimeout(blinkTimeout);
//   }, []);

//   // 9) Leva panel controls
//   const [_, setLevaState] = useControls("MorphTarget", () =>
//     // Create a Leva slider for each morph target in Wolf3D_Avatar
//     Object.assign(
//       {},
//       ...Object.keys(nodes.Wolf3D_Avatar.morphTargetDictionary).map((key) => {
//         return {
//           [key]: {
//             label: key,
//             value:
//               nodes.Wolf3D_Avatar.morphTargetInfluences[
//                 nodes.Wolf3D_Avatar.morphTargetDictionary[key]
//               ] || 0,
//             min: 0,
//             max: 1,
//             onChange: (val) => {
//               // Only allow direct user manipulation if in setupMode
//               if (setupMode) {
//                 lerpMorphTarget(key, val, 1);
//               }
//             },
//           },
//         };
//       })
//     )
//   );

//   useControls("FacialExpressions", {
//     chat: button(() => chat()),
//     winkLeft: button(() => {
//       setWinkLeft(true);
//       setTimeout(() => setWinkLeft(false), 300);
//     }),
//     winkRight: button(() => {
//       setWinkRight(true);
//       setTimeout(() => setWinkRight(false), 300);
//     }),
//     animation: {
//       value: animation,
//       options: animations.map((a) => a.name),
//       onChange: (val) => setAnimation(val),
//     },
//     facialExpression: {
//       options: Object.keys(facialExpressions),
//       value: facialExpression,
//       onChange: (val) => setFacialExpression(val),
//     },
//     enableSetupMode: button(() => {
//       setupMode = true;
//     }),
//     disableSetupMode: button(() => {
//       setupMode = false;
//     }),
//     logMorphTargetValues: button(() => {
//       // Print out current morph target values so you can copy/paste for a new expression
//       const emotionValues = {};
//       const dict = nodes.Wolf3D_Avatar.morphTargetDictionary;
//       const influences = nodes.Wolf3D_Avatar.morphTargetInfluences;
//       Object.keys(dict).forEach((key) => {
//         if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
//         const value = influences[dict[key]];
//         if (value > 0.01) {
//           emotionValues[key] = parseFloat(value.toFixed(2));
//         }
//       });
//       console.log(JSON.stringify(emotionValues, null, 2));
//     }),
//   });

//   // 10) Render the model
//   return (
//     <group ref={group} {...props} dispose={null}>
//       {/* The new model structure: a "Hips" primitive + single Wolf3D_Avatar skinned mesh */}
//       <primitive object={nodes.Hips} />
//       <skinnedMesh
//         name="Wolf3D_Avatar"
//         geometry={nodes.Wolf3D_Avatar.geometry}
//         material={materials.Wolf3D_Avatar}
//         skeleton={nodes.Wolf3D_Avatar.skeleton}
//         morphTargetDictionary={nodes.Wolf3D_Avatar.morphTargetDictionary}
//         morphTargetInfluences={nodes.Wolf3D_Avatar.morphTargetInfluences}
//       />
//     </group>
//   );
// }

// // Preload both the main avatar model and the animation file
// useGLTF.preload("/models/therapist_avatar.glb");
// useGLTF.preload("/models/animations.glb");
// src/components/Avatar.jsx
import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useChat } from "./hooks/useChat";
import * as THREE from "three";

export function Avatar() {
  // Load your 3D model & animations from public/models/
  const { scene, nodes, materials } = useGLTF("/models/therapist_avatar.glb");
  const { animations } = useGLTF("/models/animations.glb");
  
  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);

  const { message, onMessagePlayed } = useChat();
  const [audio, setAudio] = useState(null);

  // If your Node returns { audio: "base64..." }
  useEffect(() => {
    if (message?.audio) {
      const newAudio = new Audio(`data:audio/mp3;base64,${message.audio}`);
      newAudio.play();
      setAudio(newAudio);
      newAudio.onended = onMessagePlayed;
    }
  }, [message, onMessagePlayed]);

  // Idle animation
  useEffect(() => {
    if (!actions) return;
    const idle = actions["Idle"] || actions[Object.keys(actions)[0]];
    if (idle) {
      idle.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Avatar"
        geometry={nodes.Wolf3D_Avatar.geometry}
        material={materials.Wolf3D_Avatar}
        skeleton={nodes.Wolf3D_Avatar.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Avatar.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Avatar.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/therapist_avatar.glb");
useGLTF.preload("/models/animations.glb");
