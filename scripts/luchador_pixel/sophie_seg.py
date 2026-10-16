import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from segmentar import *
a=np.load(S+'/datos/sophie_limpio.npy')
# pelo: fuera los pixeles turquesa sueltos
for (x,y) in [(1,18),(1,19),(6,22),(6,23)]: a[y,x]=22
# cara de anime a mano: flequillo en puntas, ojos grandes con brillo, cachetes y boquita
parche(a,20,16,[
"UUVUUVUUVW",
"VUDVUCVUDV",
"CCDCCCCCVV",
"AACCAAACVV",
"XYCCXXYCVV",
"VXCCVXXCCW",
"CCCCCNNCCA",
"CCCCCCEC  ",
])
np.save(SAL+'/sophie_base.npy',a)
png('sophie',a,SAL+'/sophie_base_x8.png')
H,W=a.shape
defs={
 'cabeza':{'poly':[[(-1,-1),(30,-1),(30,24),(27,25),(17,25),(-1,25)]],'pivote':(24,25),'padre':'torso'},
 'antebrazoC':{'poly':[[(13,25),(20,25),(20,30),(15,34),(12,37),(9,37),(9,33)]],'pivote':(11,35),'padre':'brazoC'},
 'brazoC':{'poly':[[(12,26),(17,26),(16,31),(13,37),(8,37),(8,31)]],'pivote':(15,28),'padre':'torso'},
 'antebrazoL':{'poly':[[(30,22),(38,22),(38,37),(29,37),(29,30)]],'pivote':(32,35),'padre':'brazoL'},
 'brazoL':{'poly':[[(25,26),(30,26),(31,33),(28,35),(25,32)]],'pivote':(28,28),'padre':'torso'},
 'piernaC':{'poly':[[(-1,58),(21,56),(21,79),(-1,79)]],'pivote':(14,57),'padre':'musloC'},
 'musloC':{'poly':[[(11,48),(22,48),(21,57),(10,59)]],'pivote':(17,47),'padre':None},
 'piernaL':{'poly':[[(26,55),(38,54),(38,79),(23,79)]],'pivote':(34,54),'padre':'musloL'},
 'musloL':{'poly':[[(24,42),(38,42),(38,55),(31,56),(24,50)]],'pivote':(27,46),'padre':None},
 'torso':{'pivote':(22,44),'padre':None},
}
orden=['cabeza','antebrazoC','brazoC','antebrazoL','brazoL','piernaC','musloC','piernaL','musloL']
rell={'torso':[[(13,26),(31,26),(31,44),(13,44)]],'musloL':[[(24,42),(30,42),(30,47),(24,47)]],'musloC':[[(13,44),(22,44),(22,49),(13,49)]]}
partes=segmentar('sophie',a,defs,orden,rell,solape=2)
partes['fondo']=relleno_aparte(partes,'torso',[[(13,40),(35,40),(35,52),(13,52)]],W,H)
defs['fondo']={'pivote':(22,44),'padre':'torso'}
vista('sophie',partes,SAL+'/sophie_partes_vista.png',W,H)
for p,v in partes.items(): print(p,(v>=0).sum())
dibujo=['fondo','antebrazoL','brazoL','piernaL','musloL','piernaC','musloC','torso','cabeza','brazoC','antebrazoC']
zon={'fondo':'cuerpo','cabeza':'cabeza','torso':'cuerpo','brazoC':'cuerpo','brazoL':'cuerpo','antebrazoC':'cuerpo','antebrazoL':'cuerpo','musloC':'piernas','musloL':'piernas','piernaC':'piernas','piernaL':'piernas'}
pts={'puñoC':('antebrazoC',(17,28)),'puñoL':('antebrazoL',(34,26)),'pieC':('piernaC',(10,74)),'pieL':('piernaL',(30,68)),'tobilloC':('piernaC',(11,68)),'tobilloL':('piernaL',(30,62)),'cabeza':('cabeza',(22,14))}
escribir_ts(REPO+'/src/engine/luchador/pixel/sophie.ts','SOPHIE_PIXEL','Sophie','sophie',partes,defs,78,22,W,H,dibujo,pts,zon,
 ['Sophie en pixel a mano, a 78 px de alto, dos tercios de Rick. Su kimono turquesa, la licra azul noche, las',
  'zapatillas blancas y rosadas y la cola con el lazo. La hoja sale de una referencia de pose pintada aparte, bajada',
  'a esta escala con 25 tonos y retocada a mano: la cara de anime con los ojos grandes, el flequillo y el pelo limpio.',
  'Está cortada en piezas con sus juntas. Mira a la derecha, en guardia.'])
