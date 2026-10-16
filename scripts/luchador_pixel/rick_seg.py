import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from segmentar import *
a=np.load(SAL+'/rick_base.npy'); H,W=a.shape
defs={
 'cabeza':{'poly':[[(33,0),(48,0),(48,15),(45,16),(36,16),(33,12)],[(6,0),(33,0),(33,10),(28,11),(20,13),(6,13)]],'pivote':(39,15),'padre':'torso'},
 'antebrazoC':{'poly':[[(24,38),(25,30),(28,20),(34,17),(43,19),(43,31),(36,33),(30,38)]],'pivote':(25,35),'padre':'brazoC'},
 'brazoC':{'poly':[[(12,15),(28,13),(31,18),(29,28),(27,40),(15,40),(12,30)]],'pivote':(22,18),'padre':'torso'},
 'antebrazoL':{'poly':[[(55,27),(57,16),(64,14),(71,18),(71,31),(63,38),(56,35)]],'pivote':(57,32),'padre':'brazoL'},
 'brazoL':{'poly':[[(46,14),(51,13),(56,21),(61,29),(61,38),(52,38),(47,30),(45,22)]],'pivote':(48,18),'padre':'torso'},
 'piernaC':{'poly':[[(-1,73),(30,68),(26,80),(16,95),(15,109),(-1,109)]],'pivote':(17,74),'padre':'musloC'},
 'musloC':{'poly':[[(17,44),(33,46),(33,64),(30,68),(-1,73),(10,60),(14,52)]],'pivote':(28,50),'padre':None},
 'piernaL':{'poly':[[(44,71),(66,68),(66,90),(71,103),(71,109),(49,109),(49,96),(45,85)]],'pivote':(54,72),'padre':'musloL'},
 'musloL':{'poly':[[(37,46),(46,43),(54,55),(63,66),(66,68),(44,71),(40,64),(37,61)]],'pivote':(43,50),'padre':None},
 'torso':{'pivote':(36,44),'padre':None},
}
orden=['cabeza','antebrazoC','brazoC','antebrazoL','brazoL','piernaC','musloC','piernaL','musloL']
rell={
      'musloL':[[(37,44),(48,44),(48,50),(37,50)]],'musloC':[[(24,44),(36,44),(36,50),(24,50)]]}
partes=segmentar('rick',a,defs,orden,rell)
from rick_pecho import pintar_pecho
partes['torso']=pintar_pecho(partes['torso'])
partes['fondo']=relleno_aparte(partes,'torso',[[(24,40),(50,40),(50,56),(24,56)]],W,H)
defs['fondo']={'pivote':(36,44),'padre':'torso'}
vista('rick',partes,SAL+'/rick_partes_vista.png',W,H)
for p,v in partes.items(): print(p,(v>=0).sum())
dibujo=['fondo','antebrazoL','brazoL','piernaL','musloL','piernaC','musloC','torso','cabeza','brazoC','antebrazoC']
zon={'fondo':'cuerpo','cabeza':'cabeza','torso':'cuerpo','brazoC':'cuerpo','brazoL':'cuerpo','antebrazoC':'cuerpo','antebrazoL':'cuerpo','musloC':'piernas','musloL':'piernas','piernaC':'piernas','piernaL':'piernas'}
pts={'puñoC':('antebrazoC',(35,25)),'puñoL':('antebrazoL',(64,21)),'pieC':('piernaC',(6,104)),'pieL':('piernaL',(64,104)),'cabeza':('cabeza',(41,9)),'tobilloC':('piernaC',(8,94)),'tobilloL':('piernaL',(56,93))}
escribir_ts(REPO+'/src/engine/luchador/pixel/rick.ts','RICK_PIXEL','Rick','rick',partes,defs,108,36,W,H,dibujo,pts,zon,
 ['Rick en pixel a mano, a la escala de SF2 (108 px de alto). La hoja sale de una referencia de pose pintada aparte,',
  'bajada a esta escala con su paleta de 23 tonos y retocada a mano: la cara con los lentes, la cinta que ondea y el',
  'ruido limpio. Está cortada en piezas con sus juntas para posarla. Mira a la derecha, en guardia.'])
variantes_ts(REPO+'/src/engine/luchador/pixel/rick.ts','RICK_CARAS','Las caras de Rick, retocadas a mano sobre la misma cabeza: el dolor con los ojos apretados y el grito de la onda.','cabeza',defs,partes,a,{
 'dolor':[(40,7,["EFFFF"]),(41,8,["MFFM"]),(41,9,["AMM"]),(41,11,["AAAA"]),(41,12,["AJJA"]),(42,13,["AA"])],
 'grito':[(41,7,["FFAF"]),(41,11,["AAA"]),(41,12,["AJJA"]),(41,13,["AJA"])],
})
