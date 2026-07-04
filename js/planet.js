import * as THREE from 'three';

const sunDir = new THREE.Vector3(300, 150, -400).normalize();

const PlanetShader = {
    uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: sunDir }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vPos;
        varying vec3 vWorldPos;
        void main(){
            vUv=uv;
            vNormal=normalize(normalMatrix*normal);
            vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
            vPos=(modelViewMatrix*vec4(position,1.0)).xyz;
            vWorldPos=(modelMatrix*vec4(position,1.0)).xyz;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vPos;
        varying vec3 vWorldPos;

        vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

        float snoise(vec2 v){
            const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
            vec2 i=floor(v+dot(v,C.yy));
            vec2 x0=v-i+dot(i,C.xx);
            vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
            vec4 x12=x0.xyxy+C.xxzz;
            x12.xy-=i1;
            i=mod289(i);
            vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
            vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
            m=m*m;m=m*m;
            vec3 x=2.0*fract(p*C.www)-1.0;
            vec3 h=abs(x)-0.5;
            vec3 ox=floor(x+0.5);
            vec3 a0=x-ox;
            m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
            vec3 g;
            g.x=a0.x*x0.x+h.x*x0.y;
            g.yz=a0.yz*x12.xz+h.yz*x12.yw;
            return 130.0*dot(m,g);
        }

        float fbm(vec2 p){
            float v=0.0;
            float a=0.5;
            vec2 shift=vec2(100.0);
            for(int i=0;i<5;i++){
                v+=a*snoise(p);
                p=p*2.0+shift;
                a*=0.5;
            }
            return v;
        }

        float fbm3(vec2 p){
            float v=0.0;
            float a=0.5;
            vec2 shift=vec2(100.0);
            for(int i=0;i<3;i++){
                v+=a*snoise(p);
                p=p*2.0+shift;
                a*=0.5;
            }
            return v;
        }

        // Domain warped FBM for irregular coastlines
        float warpedFBM(vec2 p){
            float q1=fbm3(p);
            float q2=fbm3(p+vec2(5.2,1.3));
            float q3=fbm3(p+vec2(q1*0.5,q2*0.5)+vec2(1.7,9.2));
            return fbm(p+vec2(q1,q2)*0.4+q3*0.2);
        }

        // Ridged noise for sharp mountain ridges
        float ridgedFBM(vec2 p){
            float v=0.0;
            float a=0.5;
            for(int i=0;i<5;i++){
                float n=1.0-abs(snoise(p));
                n=n*n;
                v+=n*a;
                p=p*2.0+vec2(100.0);
                a*=0.5;
            }
            return v;
        }

        float terrainHeight(vec2 p){
            float continent=warpedFBM(p*2.5+5.0);
            float detail=fbm(p*8.0+20.0);
            float micro=fbm(p*24.0+50.0);
            float land=continent*0.6+detail*0.3+micro*0.1;
            land=land*0.5+0.5;
            return land;
        }

        vec3 calcBumpNormal(vec2 uv,float strength){
            float h=terrainHeight(uv);
            vec2 e1=vec2(0.005,0.0);
            vec2 e2=vec2(0.0,0.005);
            vec2 uv1=fract(uv+e1);
            vec2 uv2=fract(uv+e2);
            float hx=terrainHeight(uv1);
            float hy=terrainHeight(uv2);
            vec3 T=normalize(dFdx(vWorldPos));
            vec3 B=normalize(dFdy(vWorldPos));
            vec3 Ngeo=normalize(cross(B,T));
            vec3 bump=T*(hx-h)*strength+B*(hy-h)*strength;
            return normalize(Ngeo-bump);
        }

        void main(){
            vec2 uv=vUv;
            vec3 N=normalize(vWorldNormal);
            vec3 bumpN=calcBumpNormal(uv,0.15);
            vec3 blendedN=normalize(mix(N,bumpN,0.2));
            vec3 L=normalize(uSunDir);
            vec3 V=normalize(-vPos);
            float sunDot=dot(blendedN,L);
            float dayFactor=smoothstep(-0.1,0.4,sunDot);

            // === TERRAIN ===
            float continent=warpedFBM(uv*2.5+5.0);
            float detail=fbm(uv*8.0+20.0);
            float micro=fbm(uv*24.0+50.0);

            float land=continent*0.6+detail*0.3+micro*0.1;
            land=land*0.5+0.5;
            float isLand=smoothstep(0.44,0.56,land);

            // Coastal detail — irregular shoreline
            float coastalNoise=fbm(uv*20.0+30.0);
            float coastalDetail=smoothstep(0.43,0.57,land)*smoothstep(0.57,0.43,land);
            isLand+=coastalDetail*coastalNoise*0.15;
            isLand=clamp(isLand,0.0,1.0);

            // Shallow water
            float oceanDetail=fbm(uv*10.0+30.0);
            float shallow=smoothstep(0.42,0.52,land)*smoothstep(0.58,0.48,land);
            float isShallow=shallow*smoothstep(0.45,0.55,oceanDetail);

            // === MOUNTAINS (ridged noise) ===
            float mountainRidge=ridgedFBM(uv*6.0+20.0);
            float mountainHeight=smoothstep(0.56,0.72,land);
            float isMountain=mountainHeight*smoothstep(0.3,0.7,mountainRidge);

            // Valley carving — erosion channels
            float valleyNoise=ridgedFBM(uv*10.0+40.0);
            float valley=smoothstep(0.6,0.4,valleyNoise)*isMountain*0.3;
            isMountain-=valley;

            // Snow caps
            float peaks=ridgedFBM(uv*12.0+40.0);
            float isPeak=isMountain*smoothstep(0.55,0.75,peaks);

            // === LATITUDE ===
            float lat=abs(uv.y-0.5)*2.0;
            float iceCap=smoothstep(0.82,0.92,lat);
            float iceEdge=smoothstep(0.78,0.85,lat)*smoothstep(0.95,0.88,lat);
            iceCap+=iceEdge*0.3*smoothstep(0.3,0.7,warpedFBM(uv*4.0+100.0));
            iceCap=clamp(iceCap,0.0,1.0);

            float desert=smoothstep(0.25,0.35,lat)*smoothstep(0.45,0.35,lat);
            desert*=smoothstep(0.48,0.55,land)*smoothstep(0.58,0.50,land);
            desert*=0.3;

            // === COLORS ===
            // Ocean with depth variation
            vec3 oceanDeep=vec3(0.02,0.08,0.28);
            vec3 oceanMid=vec3(0.04,0.15,0.40);
            vec3 oceanShallowCol=vec3(0.08,0.28,0.52);
            float depth=fbm3(uv*15.0+30.0)*0.5+0.5;
            vec3 oceanDay=mix(oceanDeep,oceanMid,depth*0.6);
            oceanDay=mix(oceanDay,oceanShallowCol,isShallow);

            // Land with biome variation
            float biomeNoise=warpedFBM(uv*5.0+60.0);
            vec3 landGreen=vec3(0.08,0.22,0.05);
            vec3 landForest=vec3(0.04,0.14,0.03);
            vec3 landSavanna=vec3(0.18,0.20,0.06);
            vec3 landTropical=vec3(0.06,0.18,0.08);

            vec3 landDay=mix(landGreen,landForest,smoothstep(0.5,0.6,land));
            landDay=mix(landDay,landSavanna,smoothstep(0.3,0.5,biomeNoise)*smoothstep(0.4,0.6,land));
            landDay=mix(landDay,landTropical,smoothstep(0.6,0.8,biomeNoise)*(1.0-desert));

            // Add subtle brown/ochre patches on land
            float earthPatch=fbm(uv*12.0+70.0);
            vec3 earthBrown=vec3(0.22,0.16,0.08);
            landDay=mix(landDay,earthBrown,smoothstep(0.5,0.7,earthPatch)*0.2*isLand);

            // Desert
            vec3 desertDay=vec3(0.55,0.45,0.28);
            vec3 desertDune=vec3(0.62,0.52,0.32);
            desertDay=mix(desertDay,desertDune,fbm(uv*20.0+80.0)*0.5+0.5);

            // Mountains
            vec3 mountainRock=vec3(0.38,0.30,0.20);
            vec3 mountainDark=vec3(0.25,0.20,0.14);
            vec3 mountainDay=mix(mountainRock,mountainDark,ridgedFBM(uv*14.0+25.0));
            mountainDay=mix(mountainDay,vec3(0.85,0.88,0.92),smoothstep(0.55,0.72,mountainRidge)*0.6);

            vec3 peakSnow=vec3(0.92,0.94,0.97);
            mountainDay=mix(mountainDay,peakSnow,isPeak*0.8);

            vec3 iceDay=vec3(0.88,0.92,0.97);

            // Night colors
            vec3 oceanNightCol=vec3(0.005,0.01,0.04);
            vec3 landNightCol=vec3(0.008,0.015,0.005);
            vec3 mountainNightCol=vec3(0.02,0.015,0.01);
            vec3 desertNightCol=vec3(0.03,0.02,0.01);
            vec3 iceNight=vec3(0.05,0.07,0.12);

            // Compose day colors
            vec3 dayCol=mix(oceanDay,landDay,isLand);
            dayCol=mix(dayCol,desertDay,desert);
            dayCol=mix(dayCol,mountainDay,isMountain);
            dayCol=mix(dayCol,iceDay,iceCap);

            // Compose night colors
            vec3 nightCol=mix(oceanNightCol,landNightCol,isLand);
            nightCol=mix(nightCol,desertNightCol,desert);
            nightCol=mix(nightCol,mountainNightCol,isMountain);
            nightCol=mix(nightCol,iceNight,iceCap);

            vec3 col=mix(nightCol,dayCol,dayFactor);

            // === TERMINATOR ===
            float terminator=smoothstep(-0.1,0.15,sunDot);
            float terminatorWarm=exp(-abs(sunDot-0.05)*20.0)*0.3;
            col+=vec3(0.8,0.3,0.05)*terminatorWarm*terminator;

            // === ATMOSPHERE ===
            float viewAngle=1.0-max(dot(V,blendedN),0.0);
            float rayleigh=pow(viewAngle,2.5);
            float rayleighSun=smoothstep(-0.2,0.3,sunDot);
            vec3 rayleighBlue=vec3(0.15,0.3,0.8);
            vec3 rayleighOrange=vec3(0.8,0.35,0.1);
            vec3 rayleighCol=mix(rayleighOrange,rayleighBlue,rayleighSun);
            col+=rayleighCol*rayleigh*rayleighSun*0.25;

            float rimNight=smoothstep(0.0,-0.3,sunDot);
            col+=vec3(0.05,0.1,0.25)*pow(viewAngle,4.0)*rimNight*0.3;

            // === CITY LIGHTS ===
            vec2 noiseUV=uv*40.0+50.0;
            float cityNoise=snoise(noiseUV);
            float cityNoise2=snoise(noiseUV*2.5+7.0);
            float cityCluster=smoothstep(0.3,0.6,cityNoise)*smoothstep(0.2,0.5,cityNoise2);

            // Cities cluster along coastlines
            float coastalProximity=smoothstep(0.56,0.50,land)*smoothstep(0.44,0.50,land);
            // And inland population centers
            float inlandPop=smoothstep(0.52,0.62,land)*smoothstep(0.68,0.58,land)*0.5;
            float cityDensity=cityCluster*isLand*(coastalProximity+inlandPop);

            // Highway connections between clusters
            float highway=smoothstep(0.48,0.52,fbm(uv*30.0+90.0))*isLand*0.15;
            cityDensity+=highway*cityCluster;

            float nightLights=smoothstep(0.1,-0.2,sunDot);
            float cityFlicker=0.85+sin(cityNoise*50.0+cityNoise2*30.0)*0.15;
            col+=vec3(1.0,0.82,0.5)*cityDensity*nightLights*cityFlicker*0.9;
            col+=vec3(0.6,0.8,1.0)*cityDensity*nightLights*0.1;

            // === CLOUDS ===
            float cloudBase=warpedFBM(uv*4.0+vec2(uTime*0.015,0.0));
            float cloudDetail=fbm(uv*10.0+vec2(uTime*0.02,50.0));
            float cloud=cloudBase*0.7+cloudDetail*0.3;
            cloud=smoothstep(0.35,0.65,cloud);

            // Storm systems
            float stormX=uv.x*6.28+uTime*0.008;
            float stormY=uv.y*3.14;
            float stormBand=sin(stormY*3.0)*0.3+0.7;
            float stormVortex=warpedFBM(vec2(stormX*stormBand,stormY*2.0)+uTime*0.01);
            float storm=smoothstep(0.55,0.75,stormVortex)*0.4;
            cloud=clamp(cloud+storm,0.0,1.0);

            // Cloud shadows on surface
            float cloudShadow=mix(1.0,0.7,cloud*0.4);
            col*=cloudShadow;

            float cloudBright=smoothstep(-0.1,0.4,sunDot);
            vec3 cloudDayCol=vec3(0.95,0.96,0.98);
            vec3 cloudNightCol=vec3(0.02,0.025,0.05);
            vec3 cloudTerminatorCol=vec3(0.7,0.4,0.2);
            vec3 cloudCol=mix(cloudNightCol,cloudDayCol,cloudBright);
            float cloudTerminator=exp(-abs(sunDot-0.05)*15.0)*0.5;
            cloudCol=mix(cloudCol,cloudTerminatorCol,cloudTerminator);

            col=mix(col,cloudCol,cloud*0.55);

            // === OCEAN SPECULAR ===
            float isOcean=1.0-isLand;
            float sunSpec=pow(max(dot(reflect(-L,blendedN),V),0.0),64.0);
            col+=vec3(1.0,0.97,0.9)*sunSpec*dayFactor*isOcean*0.35;

            // === TERMINATOR GLOW ===
            float terminatorGlow=exp(-abs(sunDot)*6.0)*0.12;
            col+=vec3(1.0,0.4,0.1)*terminatorGlow;

            gl_FragColor=vec4(col,1.0);
        }
    `
};

export function createPlanet() {
    const group = new THREE.Group();
    group.position.set(0, 0, -20);

    const planetMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSunDir: { value: new THREE.Vector3(300, 150, -400).normalize() }
        },
        vertexShader: PlanetShader.vertexShader,
        fragmentShader: PlanetShader.fragmentShader
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(5, 128, 128), planetMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const cloudMat = new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: { value: new THREE.Vector3(300, 150, -400).normalize() },
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec3 vWorldNormal;
            varying vec2 vUv;
            varying vec3 vViewDir;
            void main(){
                vUv=uv;
                vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
                vViewDir=normalize((modelViewMatrix*vec4(position,1.0)).xyz);
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uSunDir;
            uniform float uTime;
            varying vec3 vWorldNormal;
            varying vec2 vUv;
            varying vec3 vViewDir;

            vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

            float snoise(vec2 v){
                const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
                vec2 i=floor(v+dot(v,C.yy));
                vec2 x0=v-i+dot(i,C.xx);
                vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
                vec4 x12=x0.xyxy+C.xxzz;
                x12.xy-=i1;
                i=mod289(i);
                vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
                vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
                m=m*m;m=m*m;
                vec3 x=2.0*fract(p*C.www)-1.0;
                vec3 h=abs(x)-0.5;
                vec3 ox=floor(x+0.5);
                vec3 a0=x-ox;
                m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
                vec3 g;
                g.x=a0.x*x0.x+h.x*x0.y;
                g.yz=a0.yz*x12.xz+h.yz*x12.yw;
                return 130.0*dot(m,g);
            }

            float fbm(vec2 p){
                float v=0.0;
                float a=0.5;
                for(int i=0;i<4;i++){
                    v+=a*snoise(p);
                    p=p*2.0+vec2(100.0);
                    a*=0.5;
                }
                return v;
            }

            void main(){
                vec3 N=normalize(vWorldNormal);
                vec3 L=normalize(uSunDir);
                float sunDot=dot(N,L);

                float lat=abs(vUv.y-0.5)*2.0;

                float drift=sin(vUv.x*6.28*3.0+uTime*0.01)*0.02*lat;
                vec2 cloudUV=vUv+vec2(uTime*0.02+drift,uTime*0.005);

                float cloudA=fbm(cloudUV*5.0);
                float cloudB=fbm(cloudUV*11.0+50.0);
                float cloud=cloudA*0.65+cloudB*0.35;
                cloud=smoothstep(0.32,0.68,cloud);

                float polarCloud=smoothstep(0.78,0.92,lat)*smoothstep(0.3,0.5,fbm(vUv*3.0+200.0));
                cloud=clamp(cloud+polarCloud*0.5,0.0,1.0);

                float dayBright=smoothstep(-0.1,0.4,sunDot);
                vec3 dayCol=vec3(0.95,0.96,0.98);
                vec3 nightCol=vec3(0.02,0.025,0.04);
                vec3 terminatorCol=vec3(0.65,0.35,0.15);
                vec3 col=mix(nightCol,dayCol,dayBright);
                float term=exp(-abs(sunDot-0.05)*12.0)*0.6;
                col=mix(col,terminatorCol,term);

                float fresnel=1.0-max(dot(vViewDir,N),0.0);

                float alpha=mix(0.01,0.35,cloud);
                alpha=clamp(alpha,0.0,0.4);

                gl_FragColor=vec4(col,alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(5.08, 128, 96), cloudMat);
    group.add(clouds);

    const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: { value: new THREE.Vector3(300, 150, -400).normalize() }
        },
        vertexShader: `
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            void main(){
                vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
                vViewDir=normalize((modelViewMatrix*vec4(position,1.0)).xyz);
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uSunDir;
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            void main(){
                vec3 N=normalize(vWorldNormal);
                vec3 L=normalize(uSunDir);
                vec3 V=normalize(-vViewDir);
                float sunDot=dot(N,L);

                float viewAngle=1.0-max(dot(V,N),0.0);
                float fresnel=pow(viewAngle,2.0);

                float rayleighBlue=pow(viewAngle,3.0)*smoothstep(-0.1,0.3,sunDot);
                float rayleighOrange=pow(viewAngle,1.5)*exp(-abs(sunDot-0.1)*8.0)*0.5;

                vec3 blueCol=vec3(0.12,0.3,0.85);
                vec3 orangeCol=vec3(0.9,0.35,0.08);
                vec3 col=blueCol*rayleighBlue+orangeCol*rayleighOrange;

                float alpha=fresnel*0.18;
                alpha*=smoothstep(-0.3,0.2,sunDot)*0.7+0.3;

                gl_FragColor=vec4(col,alpha);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(5.25, 96, 64), atmoMat));

    const outerAtmoMat = new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: { value: new THREE.Vector3(300, 150, -400).normalize() }
        },
        vertexShader: `
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            void main(){
                vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
                vViewDir=normalize((modelViewMatrix*vec4(position,1.0)).xyz);
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uSunDir;
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            void main(){
                vec3 N=normalize(vWorldNormal);
                vec3 V=normalize(-vViewDir);
                vec3 L=normalize(uSunDir);
                float sunDot=dot(N,L);
                float viewAngle=1.0-max(dot(V,N),0.0);
                float fresnel=pow(viewAngle,2.5);
                float dayFactor=smoothstep(-0.15,0.3,sunDot);
                vec3 col=vec3(0.08,0.18,0.5)*dayFactor+vec3(0.02,0.03,0.1)*(1.0-dayFactor);
                float alpha=fresnel*0.08*dayFactor;
                gl_FragColor=vec4(col,alpha);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(5.55, 64, 48), outerAtmoMat));

    return { group, mesh, planetMat, clouds, cloudMat };
}

export function animatePlanet(mesh, planetMat, clouds, cloudMat, time) {
    mesh.rotation.y += 0.002;
    planetMat.uniforms.uTime.value = time;
    clouds.rotation.y += 0.001;
    cloudMat.uniforms.uTime.value = time;
}
