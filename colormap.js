<!-- colormap fragment shader -->
<script id="colormap-fragment-shader" type="x-shader/x-fragment">
	precision mediump float;
	
	// our texture
	uniform sampler2D u_image;
	
	// the texCoords passed in from the vertex shader.
	varying vec2 v_texCoord;
	
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
//				float elevation = texture2D(elevationMap, gl_TexCoord[0].st).a;
		float elevation = texture2D(u_image, v_texCoord).a;
		float waterlayer = 0.0; //texture2D(waterlevelMap, v_texCoord).a;
		
		if (elevation==0.0) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		else {
			if (waterlayer > 0.0 && waterlayer > level - elevation) gl_FragColor = col(-waterlayer);
			else gl_FragColor = col(elevation - level);
		}
	}
</script>
