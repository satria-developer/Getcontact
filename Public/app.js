const $ = sel => document.querySelector(sel);
const phoneInput = $('#phoneInput');
const searchBtn = $('#searchBtn');
const tagInput = $('#tagInput');
const addTagBtn = $('#addTagBtn');
const status = $('#status');
const results = $('#results');

function normalizePhone(s){
  if(!s) return '';
  s = s.trim();
  s = s.replace(/[^\d+]/g,'');
  if(s.startsWith('0')) s = '+62' + s.slice(1);
  return s;
}

async function fetchTags(phone){
  const res = await fetch(`/api/tags?phone=${encodeURIComponent(phone)}`);
  if(!res.ok) throw new Error('Server error');
  return res.json();
}

searchBtn.addEventListener('click', async ()=>{
  const raw = phoneInput.value;
  const phone = normalizePhone(raw);
  if(!phone) return alert('Masukkan nomor');
  status.textContent = 'Mencari...';
  results.innerHTML = '';
  try{
    const data = await fetchTags(phone);
    if(!data.tags || data.tags.length===0){
      status.textContent = 'Tidak ada tag untuk ' + phone;
      return;
    }
    status.textContent = `Ditemukan ${data.tags.length} tag`;
    data.tags.forEach(t => {
      const div = document.createElement('div');
      div.className = 'tag';
      div.innerHTML = `${t.tag} <button data-id="${t.id}" style="margin-left:8px">Laporkan</button>`;
      const btn = div.querySelector('button');
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-id');
        await fetch('/api/report', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id}) });
        alert('Dilaporkan. Terima kasih.');
      });
      results.appendChild(div);
    });
  }catch(err){
    console.error(err);
    alert('Gagal mengambil tag');
  }
});

addTagBtn.addEventListener('click', async ()=>{
  const phone = normalizePhone(phoneInput.value);
  const tag = (tagInput.value || '').trim();
  if(!phone || !tag) return alert('Isi nomor dan tag');
  try{
    const res = await fetch('/api/tags', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ phone, tag }) });
    const j = await res.json();
    if(!j.ok) return alert('Gagal: ' + (j.error||'unknown'));
    alert('Tag tersimpan');
    tagInput.value = '';
    searchBtn.click();
  }catch(err){
    console.error(err);
    alert('Gagal menyimpan tag');
  }
});
