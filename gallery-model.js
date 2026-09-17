(function(root) {
  const fold = value => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const publicItems = items => items.filter(x => x.collection === 'konular' || x.collection === 'sehirler');
  const filter = (items, state) => items.filter(x => (!state.collection || x.collection === state.collection) && (!state.category || x.category === state.category) && (!state.detail || x.detail === state.detail) && fold(state.search).trim().split(/\s+/).every(word => fold([x.name,x.label,x.category,x.detail,...(x.tags || [])].join(' ')).includes(word)));
  const preferred = ['Günbatımı','Deniz ve Sahiller','Can Dostlar','Çiçekler','Kuşlar','Doğa ve Manzara'];
  const sample = items => [items[0],items[Math.floor(items.length/2)],items[items.length-1]].filter((x,i,a) => x && a.indexOf(x) === i);
  function featured(items) {
    const topics = [...new Set(items.filter(x => x.collection==='konular').map(x=>x.category))].sort((a,b) => {
      const rank=x=>preferred.includes(x)?preferred.indexOf(x):preferred.length;
      return rank(a)-rank(b)||a.localeCompare(b,'tr');
    }).slice(0,6);
    const groups = topics.map(category => ({collection:'konular',category,detail:'',label:category,items:sample(items.filter(x=>x.collection==='konular'&&x.category===category))}));
    const cities = new Map();
    items.filter(x=>x.collection==='sehirler').forEach(x=>{
      const key=JSON.stringify([x.category,x.detail]);
      if(!cities.has(key))cities.set(key,{collection:'sehirler',category:x.category,detail:x.detail,label:[x.category,x.detail].filter(Boolean).join(' · '),items:[]});
      cities.get(key).items.push(x);
    });
    return groups.concat([...cities.values()].sort((a,b)=>a.label.localeCompare(b.label,'tr')).map(g=>({...g,items:sample(g.items)})));
  }
  root.GalleryModel={fold,publicItems,filter,featured};
})(typeof window === 'undefined' ? globalThis : window);
