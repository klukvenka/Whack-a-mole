# Whack-a-Mole!

<p align="center">
<img src="https://user-images.githubusercontent.com/58031911/131756715-04e1b20f-b563-43ce-bca3-51a72396b523.png" height="95%" width="95%"/>
</p>

Final project by Aida Gasanova and Marco Donzelli for Computer Graphics course of PoliMi A.Y. 2020/2021

## How to play
Press play and move the hammer with `q` ,  `w` ,  `e` ,  `a` ,  `s`  keys. You have 60 seconds to hit as much moles as you can!

## Implementation

### Tools and languages
The game is implemented in WebGL, GLSL and Javascript with the use of the following libraries:
* __[TWGL.js](https://twgljs.org/)__, to initialize buffers, bind uniforms, etc.
* __[WebGL-obj-loader](https://www.npmjs.com/package/webgl-obj-loader)__, to load meshes from .obj file
* __[jQuery 3.6.0](https://jquery.com/)__, to handle keyboard events

### Scenegraph
The scene graph of the game holds two main nodes:
* __cabinetSpace__ which contains the hammer, the cabinet and __moleSpace__
* __moleSpace__ which contains the five moles

The root of the scene graph is stored in a global variable of the app so that the method __updateWorldMatrices()__ can be called on it and all the local matrices of child nodes get updated accordingly with changes performed meanwhile.

### Lights and BRDFs
The game is illuminated with two type of ligths, implemented in camera space:
* __direct light__ still, can't be controlled by the user
* __spot light__ direction controllable by the user along with usual spot parameters such as __coneIn__,__coneOut__, etc.

The __BRDFs__ implemented in the shaders are the Lambert model for the diffuse part and the Phong specular specular part.

Also ambient light is implemented by simplying summing a term in the output vector that provides a little bit more of the colour of the texel.

### Skybox

We implemented a separate WebGL program and drawing pipeline to draw a "skybox" type object which surrounds the main scene.
