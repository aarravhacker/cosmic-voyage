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

        float terrainHeight(vec2 p){
            float continent=fbm(p*3.0+5.0);
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

            float continent=fbm(uv*3.0+5.0);
            float detail=fbm(uv*8.0+20.0);
            float micro=fbm(uv*24.0+50.0);

            float land=continent*0.6+detail*0.3+micro*0.1;
            land=land*0.5+0.5;
            float isLand=smoothstep(0.44,0.56,land);

            float oceanDetail=fbm(uv*10.0+30.0);
            float shallow=smoothstep(0.42,0.52,land)*smoothstep(0.58,0.48,land);
            float isShallow=shallow*smoothstep(0.45,0.55,oceanDetail);

            float mountains=fbm(uv*16.0+20.0);
            float isMountain=smoothstep(0.56,0.68,land)*smoothstep(0.45,0.55,mountains);

            float peaks=fbm(uv*32.0+40.0);
            float isPeak=isMountain*smoothstep(0.6,0.75,peaks);

            float lat=abs(uv.y-0.5)*2.0;
            float iceCap=smoothstep(0.82,0.92,lat);
            float iceEdge=smoothstep(0.78,0.85,lat)*smoothstep(0.95,0.88,lat);
            iceCap+=iceEdge*0.3*smoothstep(0.3,0.7,fbm(uv*6.0+100.0));
            iceCap=clamp(iceCap,0.0,1.0);

            float desert=smoothstep(0.25,0.35,lat)*smoothstep(0.45,0.35,lat);
            desert*=smoothstep(0.48,0.55,land)*smoothstep(0.58,0.50,land);
            desert*=0.3;

            vec3 oceanDeep=vec3(0.03,0.12,0.35);
            vec3 oceanShallow=vec3(0.08,0.28,0.52);
            vec3 oceanDay=mix(oceanDeep,oceanShallow,isShallow);

            vec3 landGreen=vec3(0.10,0.26,0.07);
            vec3 landForest=vec3(0.05,0.17,0.04);
            vec3 landDay=mix(landGreen,landForest,smoothstep(0.5,0.6,land));

            vec3 desertDay=vec3(0.55,0.45,0.28);

            vec3 mountainRock=vec3(0.45,0.35,0.22);
            vec3 mountainSnow=vec3(0.88,0.9,0.94);
            vec3 mountainDay=mix(mountainRock,mountainSnow,smoothstep(0.6,0.75,mountains));

            vec3 peakSnow=vec3(0.92,0.94,0.97);
            mountainDay=mix(mountainDay,peakSnow,isPeak*0.8);

            vec3 iceDay=vec3(0.88,0.92,0.97);

            vec3 oceanNightCol=vec3(0.005,0.01,0.04);
            vec3 landNightCol=vec3(0.008,0.015,0.005);
            vec3 mountainNightCol=vec3(0.02,0.015,0.01);
            vec3 desertNightCol=vec3(0.03,0.02,0.01);
            vec3 iceNight=vec3(0.05,0.07,0.12);

            vec3 dayCol=mix(oceanDay,landDay,isLand);
            dayCol=mix(dayCol,desertDay,desert);
            dayCol=mix(dayCol,mountainDay,isMountain);
            dayCol=mix(dayCol,iceDay,iceCap);

            vec3 nightCol=mix(oceanNightCol,landNightCol,isLand);
            nightCol=mix(nightCol,desertNightCol,desert);
            nightCol=mix(nightCol,mountainNightCol,isMountain);
            nightCol=mix(nightCol,iceNight,iceCap);

            vec3 col=mix(nightCol,dayCol,dayFactor);

            float terminator=smoothstep(-0.1,0.15,sunDot);
            float terminatorWarm=exp(-abs(sunDot-0.05)*20.0)*0.3;
            col+=vec3(0.8,0.3,0.05)*terminatorWarm*terminator;

            float viewAngle=1.0-max(dot(V,blendedN),0.0);
            float rayleigh=pow(viewAngle,2.5);
            float rayleighSun=smoothstep(-0.2,0.3,sunDot);
            vec3 rayleighBlue=vec3(0.15,0.3,0.8);
            vec3 rayleighOrange=vec3(0.8,0.35,0.1);
            vec3 rayleighCol=mix(rayleighOrange,rayleighBlue,rayleighSun);
            col+=rayleighCol*rayleigh*rayleighSun*0.25;

            float rimNight=smoothstep(0.0,-0.3,sunDot);
            col+=vec3(0.05,0.1,0.25)*pow(viewAngle,4.0)*rimNight*0.3;

            vec2 noiseUV=uv*40.0+50.0;
            float cityNoise=snoise(noiseUV);
            float cityNoise2=snoise(noiseUV*2.5+7.0);
            float cityCluster=smoothstep(0.3,0.6,cityNoise)*smoothstep(0.2,0.5,cityNoise2);
            float coastalProximity=smoothstep(0.56,0.50,land)*smoothstep(0.44,0.50,land);
            float cityDensity=cityCluster*isLand*coastalProximity;
            cityDensity+=cityCluster*isLand*smoothstep(0.3,0.5,land)*0.4;
            float nightLights=smoothstep(0.1,-0.2,sunDot);
            float cityFlicker=0.85+sin(cityNoise*50.0+cityNoise2*30.0)*0.15;
            col+=vec3(1.0,0.82,0.5)*cityDensity*nightLights*cityFlicker*0.9;
            col+=vec3(0.6,0.8,1.0)*cityDensity*nightLights*0.1;

            float cloudBase=fbm(uv*5.0+vec2(uTime*0.015,0.0));
            float cloudDetail=fbm(uv*12.0+vec2(uTime*0.02,50.0));
            float cloud=cloudBase*0.7+cloudDetail*0.3;
            cloud=smoothstep(0.35,0.65,cloud);

            float stormX=uv.x*6.28+uTime*0.008;
            float stormY=uv.y*3.14;
            float stormBand=sin(stormY*3.0)*0.3+0.7;
            float stormVortex=fbm(vec2(stormX*stormBand,stormY*2.0)+uTime*0.01);
            float storm=smoothstep(0.55,0.75,stormVortex)*0.4;
            cloud=clamp(cloud+storm,0.0,1.0);

            float cloudBright=smoothstep(-0.1,0.4,sunDot);
            vec3 cloudDayCol=vec3(0.95,0.96,0.98);
            vec3 cloudNightCol=vec3(0.02,0.025,0.05);
            vec3 cloudTerminatorCol=vec3(0.7,0.4,0.2);
            vec3 cloudCol=mix(cloudNightCol,cloudDayCol,cloudBright);
            float cloudTerminator=exp(-abs(sunDot-0.05)*15.0)*0.5;
            cloudCol=mix(cloudCol,cloudTerminatorCol,cloudTerminator);

            col=mix(col,cloudCol,cloud*0.55);

            float isOcean=1.0-isLand;
            float sunSpec=pow(max(dot(reflect(-L,blendedN),V),0.0),64.0);
            col+=vec3(1.0,0.97,0.9)*sunSpec*dayFactor*isOcean*0.35;

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
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(5.08, 96, 96), cloudMat);
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
    group.add(new THREE.Mesh(new THREE.SphereGeometry(5.25, 64, 64), atmoMat));

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
    group.add(new THREE.Mesh(new THREE.SphereGeometry(5.55, 32, 32), outerAtmoMat));

    return { group, mesh, planetMat, clouds, cloudMat };
}

export function animatePlanet(mesh, planetMat, clouds, cloudMat, time) {
    mesh.rotation.y += 0.002;
    planetMat.uniforms.uTime.value = time;
    clouds.rotation.y += 0.001;
    cloudMat.uniforms.uTime.value = time;
}
