from seg_fiel import *
a=np.load(S+'/rick_idx.npy'); H,W=a.shape; pal=json.load(open(S+'/rick_pal.json'))
defs={
 'cabeza':{'poly':[[(48,-1),(83,-1),(83,30),(76,37),(68,40),(58,38),(50,28)],[(18,4),(57,4),(57,22),(46,29),(34,34),(18,37)]],'pivote':(62,36),'padre':'torso'},
 'antebrazoC':{'poly':[[(26,62),(40,60),(46,50),(48,44),(58,42),(71,45),(71,66),(56,70),(48,78),(36,82),(26,81)]],'pivote':(30,72),'padre':'brazoC'},
 'brazoC':{'poly':[[(20,35),(44,33),(50,40),(48,52),(40,58),(30,62),(20,62)]],'pivote':(38,42),'padre':'torso'},
 'antebrazoL':{'poly':[[(92,58),(97,39),(108,37),(119,41),(119,64),(108,78),(94,78)]],'pivote':(98,72),'padre':'brazoL'},
 'brazoL':{'poly':[[(79,35),(92,37),(96,50),(96,62),(92,77),(84,77),(79,60)]],'pivote':(85,42),'padre':'torso'},
 'piernaC':{'poly':[[(-1,137),(44,128),(42,150),(28,170),(24,198),(-1,198)]],'pivote':(30,132),'padre':'musloC'},
 'musloC':{'poly':[[(30,84),(52,85),(52,118),(44,128),(-1,137),(14,120),(24,100)]],'pivote':(46,92),'padre':None},
 'piernaL':{'poly':[[(72,131),(106,127),(110,165),(119,188),(119,198),(82,198),(82,175),(76,150)]],'pivote':(88,132),'padre':'musloL'},
 'musloL':{'poly':[[(70,84),(82,82),(98,104),(106,127),(72,131),(70,112)]],'pivote':(70,92),'padre':None},
 'torso':{'pivote':(60,80),'padre':None},
}
orden=['cabeza','antebrazoC','brazoC','antebrazoL','brazoL','piernaC','musloC','piernaL','musloL']
rell={'musloL':[[(62,82),(80,82),(80,96),(62,96)]],'musloC':[[(40,82),(60,82),(60,96),(40,96)]]}
partes=segmentar('rick',a,defs,orden,rell,solape=4)
from pecho_fiel import pintar_pecho
sx,sy=W/70,H/108
Pv=np.array([lib.hx(c) for c in lib.PAL['rick']],float); Pn=np.array([lib.hx(c) for c in pal],float)
Ln=srgb2lab(Pn)
viejoL={ch:srgb2lab(Pv[[None]*0+[lib.CH.index(ch)]])[0] for ch in 'AKJIHCDE'}
tono={ch:int(np.argmin(np.linalg.norm(Ln-l,axis=1))) for ch,l in viejoL.items()}
print('tonos',tono)
partes['torso']=pintar_pecho(partes['torso'],sx,sy,tono)
partes['fondo']=relleno_aparte(partes,'torso',[[(40,78),(84,78),(84,104),(40,104)]],W,H)
defs['fondo']={'pivote':(60,80),'padre':'torso'}
for p,q in partes.items(): print(p,(q>=0).sum())
np.save(S+'/rick_partes.npy',np.array([partes,defs],dtype=object),allow_pickle=True)
lib.PAL['rick']=pal
dibujo=['fondo','antebrazoL','brazoL','piernaL','musloL','piernaC','musloC','torso','cabeza','brazoC','antebrazoC']
zon={'fondo':'cuerpo','cabeza':'cabeza','torso':'cuerpo','brazoC':'cuerpo','brazoL':'cuerpo','antebrazoC':'cuerpo','antebrazoL':'cuerpo','musloC':'piernas','musloL':'piernas','piernaC':'piernas','piernaL':'piernas'}
pts={'puñoC':('antebrazoC',(58,55)),'puñoL':('antebrazoL',(108,50)),'pieC':('piernaC',(8,190)),'pieL':('piernaL',(108,188)),'cabeza':('cabeza',(66,18)),'tobilloC':('piernaC',(16,172)),'tobilloL':('piernaL',(92,172))}
DEST=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','src')+'/engine/luchador/pixel/rick.ts'
escribir_ts(DEST,'RICK_PIXEL','Rick','rick',partes,defs,H,60,W,H,dibujo,pts,zon,
 ['Rick en pixel a mano, fiel a su referencia: la hoja es la grilla original de la referencia pixel por pixel',
  f'({W} x {H}), con su paleta de {len(pal)} tonos. Está cortada en piezas con sus juntas para posarla; el pecho que',
  'tapan los brazos está pintado a mano. Mira a la derecha, en guardia.'])
variantes_ts(DEST,'RICK_CARAS','Las caras de Rick, retocadas a mano sobre la cabeza original: el dolor con los ojos apretados y el grito de la onda.','cabeza',defs,partes,a,{
 'dolor':[(69,14,["EE"," EE"]),(71,16,["EEEE","rrrr"]),(70,27,["AAAA","AKKA","AHHA"," AA "])],
 'grito':[(69,14,["EE"," EE"]),(70,26,[" AA ","AAAA","AKKA","AHHA"," AA "])],
})
