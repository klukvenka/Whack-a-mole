#version 300 es
  precision highp float;
  
  //position and normal in projection matrix from vertex shader
  in vec3 fs_pos;
  in vec3 fs_norm;
  in vec2 fs_uv;
 
  uniform sampler2D u_texture;

  //self explanatory
  uniform vec3 eyePos;

  //Light parameters (see slides lesson L12-13 and example 4)
  uniform vec3 LADir;
  uniform vec4 LAlightColor;
  uniform vec3 ADir;
  uniform vec4 diffuseColor;
  uniform float SspecKwAng;

  // Output color vector
  out vec4 color;

  //computes Lambert diffuse light
  vec4 compDiffuse(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec4 diffColor, vec3 eyedirVec) {
    
    // Diffuse component (retaining only lambert for now)
    float LdotN = max(0.0, dot(normalVec, lightDir));
    vec4 LDcol = lightCol * diffColor;
    
    // --> Lambert
    vec4 diffuseLambert = LDcol * LdotN;
    // ----> Select final component
    return         diffuseLambert;
  }

  void main() {
    vec4 texcol = texture(u_texture, fs_uv);
    vec4 diffColor = texcol;
    
    vec3 normalVec = normalize(fs_norm);
    vec3 eyedirVec = normalize(eyePos - fs_pos);

    //// online computation of tangent and bitangent

    // compute initial tangent and bi-tangent
    float tbf = max(0.0, sign(abs(normalVec.y) - 0.707));
    vec3 t = normalize(cross(normalVec, vec3(1,0,0)));
    vec3 b = normalize(cross(normalVec, t));
     
    // Diffuse
    vec4 diffuse = compDiffuse(LADir, LAlightColor, normalVec, diffColor, eyedirVec);
    
    // final steps
    float dctf = 1.0 - SspecKwAng;
    vec4 out_color = clamp(diffuse*dctf, 0.0, 1.0);
    
    color = vec4(out_color.rgb, 1.0);
}