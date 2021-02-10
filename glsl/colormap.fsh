/*
 * LICENSE
 * MapMind was developed by Harmen G. Zijp at the Cooperative University of Amersfoort. The code is distributed under the Simple Public License 2.0 which can be found at https://opensource.org/licenses/Simple-2.0
 * 
 * Contact: harmen [at] universiteitamersfoort [dot] nl
*/

// colormap fragment shader
precision mediump float;

// our textures
uniform sampler2D elevationMap;
uniform sampler2D waterlevelMap;

// declare the texture coordinate that is passed in from the fragment shader
varying vec2 v_texCoord;

// declare additional variables we pass from the main program into this shader
uniform float level;
uniform float heights[16];
uniform float reds[16];
uniform float greens[16];
uniform float blues[16];

vec4 col(float h) {
	h = h/2.0;
	float dh, r, g, b;
	for (int i=0; i<15; i++) if ((h>=heights[i]) && (h<heights[i+1])) {
		dh = float(h-heights[i])/float(heights[i+1]-heights[i]);
		r = reds[i]   + (reds[i+1]   - reds[i])   * dh;
		g = greens[i] + (greens[i+1] - greens[i]) * dh;
		b = blues[i]  + (blues[i+1]  - blues[i])  * dh;
		break;
	}
	vec4 c = vec4(r, g, b, 1.0);
	return c;
}

void main() {
	float elevation = texture2D(elevationMap, v_texCoord).r;
	float waterlayer = texture2D(waterlevelMap, v_texCoord).r + texture2D(waterlevelMap, v_texCoord).g/255.0;
	
	if (elevation==0.0) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	else {
		if (waterlayer > 0.0001 && waterlayer > level - elevation) gl_FragColor = col(-waterlayer);
		else gl_FragColor = col(elevation - level);
	}
}
