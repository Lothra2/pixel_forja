from seg_fiel import *
a=np.load(S+'/sophie_idx.npy'); H,W=a.shape; pal=json.load(open(S+'/sophie_pal.json'))
defs={
 'cabeza':{'poly':[[(-1,-1),(82,-1),(82,46),(70,52),(56,56),(44,54),(36,52),(-1,57)]],'pivote':(52,54),'padre':'torso'},
 'antebrazoC':{'poly':[[(17,74),(26,64),(30,53),(45,52),(46,64),(38,72),(30,81),(17,83)]],'pivote':(22,77),'padre':'brazoC'},
 'brazoC':{'poly':[[(17,58),(32,57),(34,64),(28,72),(20,81),(15,72)]],'pivote':(28,62),'padre':'torso'},
 'antebrazoL':{'poly':[[(64,51),(82,49),(82,64),(81,81),(68,81),(64,66)]],'pivote':(70,76),'padre':'brazoL'},
 'brazoL':{'poly':[[(57,57),(66,55),(70,66),(72,81),(62,81),(57,70)]],'pivote':(62,60),'padre':'torso'},
 'piernaC':{'poly':[[(-1,121),(43,119),(37,140),(35,169),(-1,169)]],'pivote':(31,121),'padre':'musloC'},
 'musloC':{'poly':[[(21,100),(38,100),(38,108),(46,110),(43,119),(-1,121),(21,112)]],'pivote':(38,100),'padre':None},
 'piernaL':{'poly':[[(60,113),(82,110),(82,169),(49,169),(52,130)]],'pivote':(75,113),'padre':'musloL'},
 'musloL':{'poly':[[(52,98),(66,94),(82,104),(82,110),(60,113),(52,108)]],'pivote':(58,98),'padre':None},
 'torso':{'pivote':(48,96),'padre':None},
}
orden=['cabeza','antebrazoC','brazoC','antebrazoL','brazoL','piernaC','musloC','piernaL','musloL']
rell={'torso':[[(28,55),(68,55),(68,84),(28,84)]],'musloL':[[(50,94),(62,94),(62,102),(50,102)]],'musloC':[[(32,96),(46,96),(46,104),(32,104)]]}
partes=segmentar('sophie',a,defs,orden,rell,solape=4)
partes['fondo']=relleno_aparte(partes,'torso',[[(30,90),(64,90),(64,108),(30,108)]],W,H)
defs['fondo']={'pivote':(48,96),'padre':'torso'}
for p,q in partes.items(): print(p,(q>=0).sum())
np.save(S+'/sophie_partes.npy',np.array([partes,defs],dtype=object),allow_pickle=True)
lib.PAL['sophie']=pal
dibujo=['fondo','antebrazoL','brazoL','piernaL','musloL','piernaC','musloC','torso','cabeza','brazoC','antebrazoC']
zon={'fondo':'cuerpo','cabeza':'cabeza','torso':'cuerpo','brazoC':'cuerpo','brazoL':'cuerpo','antebrazoC':'cuerpo','antebrazoL':'cuerpo','musloC':'piernas','musloL':'piernas','piernaC':'piernas','piernaL':'piernas'}
pts={'puñoC':('antebrazoC',(37,60)),'puñoL':('antebrazoL',(73,58)),'pieC':('piernaC',(22,164)),'pieL':('piernaL',(68,152)),'tobilloC':('piernaC',(24,146)),'tobilloL':('piernaL',(66,132)),'cabeza':('cabeza',(55,40))}
escribir_ts(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','src')+'/engine/luchador/pixel/sophie.ts','SOPHIE_PIXEL','Sophie','sophie',partes,defs,H,48,W,H,dibujo,pts,zon,
 ['Sophie en pixel a mano, fiel a su referencia: la hoja es la grilla original de la referencia pixel por pixel',
  f'({W} x {H}), con su paleta de {len(pal)} tonos: el kimono turquesa, la licra azul noche, las zapatillas, la cola',
  'con el lazo y la cara de anime. Está cortada en piezas con sus juntas. Mira a la derecha, en guardia.'])
