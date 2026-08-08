/* De beveiligingsregels echt uitproberen tegen de Firestore-emulator:
   doet de shop nog wat hij moet doen, en kan een vreemde er niet bij? */
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from 'firebase/firestore';

const problems = [];
const check = (n, ok, d) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${d ? ' — ' + d : ''}`); if (!ok) problems.push(n); };
async function mag(naam, belofte){
  try { await assertSucceeds(belofte); check(naam, true); }
  catch (e) { check(naam, false, String(e.message || e).slice(0, 90)); }
}
async function magNiet(naam, belofte){
  try { await assertFails(belofte); check(naam, true); }
  catch (e) { check(naam, false, 'werd toegestaan'); }
}

const env = await initializeTestEnvironment({
  projectId: 'd-printing-shop-fbc7b',
  firestore: { rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
});

// beginstand klaarzetten zonder regels
await env.withSecurityRulesDisabled(async (ctx) => {
  const d = ctx.firestore();
  await setDoc(doc(d, 'users/beheerder'), { name: 'Jelle', email: 'jelle@mattan.be', isAdmin: true });
  await setDoc(doc(d, 'users/klant'), { name: 'Klant', email: 'klant@voorbeeld.be', isAdmin: false });
  await setDoc(doc(d, 'products/p1'), { name: 'Vaas', price: 18, stock: 5 });
  await setDoc(doc(d, 'settings/filaments'), { items: [] });
  await setDoc(doc(d, 'settings/pricing'), { hourlyRate: 3.5 });
  await setDoc(doc(d, 'orders/o_klant'), { uid: 'klant', userEmail: 'klant@voorbeeld.be', status: 'Verzonden', total: 20 });
  await setDoc(doc(d, 'orders/o_ander'), { uid: 'iemand', userEmail: 'x@y.be', status: 'Verzonden', total: 9 });
  await setDoc(doc(d, 'uploads/u_klant'), { uid: 'klant', parts: [] });
  await setDoc(doc(d, 'uploads/u_klant/files/0_0'), { b: 'xx' });
});

const gast     = env.unauthenticatedContext().firestore();
const klant    = env.authenticatedContext('klant', { email: 'klant@voorbeeld.be' }).firestore();
const beheer   = env.authenticatedContext('beheerder', { email: 'jelle@mattan.be' }).firestore();
const vreemde  = env.authenticatedContext('vreemde', { email: 'boef@elders.be' }).firestore();

console.log('\n— de winkel moet blijven werken —');
await mag('bezoeker ziet de collectie', getDocs(collection(gast, 'products')));
await mag('bezoeker leest de filamenten', getDoc(doc(gast, 'settings/filaments')));
await mag('bezoeker leest de prijzen', getDoc(doc(gast, 'settings/pricing')));
await mag('klant maakt zijn profiel', setDoc(doc(klant, 'users/klant'), { name: 'Klant', email: 'klant@voorbeeld.be', address: {}, isAdmin: false }));
await mag('klant leest zijn profiel', getDoc(doc(klant, 'users/klant')));
await mag('klant plaatst een bestelling', addDoc(collection(klant, 'orders'), { uid: 'klant', userEmail: 'klant@voorbeeld.be', status: 'In verwerking', total: 5 }));
await mag('klant leest zijn bestelling', getDoc(doc(klant, 'orders/o_klant')));
await mag('klant bevestigt de ontvangst', updateDoc(doc(klant, 'orders/o_klant'), { status: 'Geleverd', receivedAt: Date.now() }));
await mag('klant bergt zijn bestelling op', updateDoc(doc(klant, 'orders/o_klant'), { hiddenForUser: true }));
await mag('klant uploadt een model', setDoc(doc(klant, 'uploads/u2'), { uid: 'klant', parts: [] }));
await mag('klant schrijft een bestandsstuk', setDoc(doc(klant, 'uploads/u2/files/0_0'), { b: 'yy' }));
await mag('klant leest zijn eigen bestandsstuk', getDoc(doc(klant, 'uploads/u_klant/files/0_0')));

console.log('\n— de beheerder moet alles kunnen —');
await mag('beheerder ziet alle bestellingen', getDocs(collection(beheer, 'orders')));
await mag('beheerder wijzigt een status', updateDoc(doc(beheer, 'orders/o_ander'), { status: 'Verzonden' }));
await mag('beheerder bergt een bestelling op', updateDoc(doc(beheer, 'orders/o_ander'), { hiddenForShop: true }));
await mag('beheerder wijzigt een product', updateDoc(doc(beheer, 'products/p1'), { price: 19 }));
await mag('beheerder maakt een product', addDoc(collection(beheer, 'products'), { name: 'Nieuw', price: 5 }));
await mag('beheerder wijzigt de prijzen', setDoc(doc(beheer, 'settings/pricing'), { hourlyRate: 4 }));
await mag('beheerder zet de e-mail in', setDoc(doc(beheer, 'settings/mail'), { serviceId: 's' }));
await mag('beheerder haalt een model op', getDoc(doc(beheer, 'uploads/u_klant')));
await mag('beheerder haalt een bestandsstuk op', getDoc(doc(beheer, 'uploads/u_klant/files/0_0')));
await mag('beheerder leest een klantprofiel', getDoc(doc(beheer, 'users/klant')));

console.log('\n— en dit mag juist niet meer —');
await magNiet('bezoeker leest bestellingen', getDocs(collection(gast, 'orders')));
await magNiet('bezoeker wijzigt een product', updateDoc(doc(gast, 'products/p1'), { price: 1 }));
await magNiet('bezoeker plaatst een bestelling', addDoc(collection(gast, 'orders'), { uid: 'x', total: 1 }));
await magNiet('vreemde leest andermans bestelling', getDoc(doc(vreemde, 'orders/o_klant')));
await magNiet('vreemde leest andermans profiel', getDoc(doc(vreemde, 'users/klant')));
await magNiet('vreemde leest andermans model', getDoc(doc(vreemde, 'uploads/u_klant')));
await magNiet('vreemde wijzigt een product', updateDoc(doc(vreemde, 'products/p1'), { price: 1 }));
await magNiet('vreemde wijzigt de prijzen', setDoc(doc(vreemde, 'settings/pricing'), { hourlyRate: 0 }));
await magNiet('klant bestelt op andermans naam', addDoc(collection(klant, 'orders'), { uid: 'iemand', total: 1 }));
await magNiet('klant verandert het bedrag', updateDoc(doc(klant, 'orders/o_klant'), { total: 0 }));
await magNiet('klant wist zijn bestelling', deleteDoc(doc(klant, 'orders/o_klant')));
await magNiet('beheerder wist een bestelling', deleteDoc(doc(beheer, 'orders/o_klant')));
await magNiet('klant maakt zichzelf beheerder', updateDoc(doc(klant, 'users/klant'), { isAdmin: true }));
await magNiet('vreemde maakt zichzelf beheerder', setDoc(doc(vreemde, 'users/vreemde'), { name: 'B', email: 'boef@elders.be', isAdmin: true }));

console.log('\n— en de beheerder krijgt zijn vlaggetje wél —');
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users/beheerder'), { name: 'Jelle', email: 'jelle@mattan.be', isAdmin: false });
});
await mag('shop zet het beheerdersvlaggetje bij het inloggen',
  updateDoc(doc(beheer, 'users/beheerder'), { isAdmin: true }));

await env.cleanup();
console.log('\n' + (problems.length ? `${problems.length} probleem(en):\n- ` + problems.join('\n- ') : 'Alles geslaagd.'));
process.exit(problems.length ? 1 : 0);
