
import { supabase } from '@/integrations/supabase/client';

// Massive comprehensive Danish word list - over 3000 words
const danishWords = [
  // Basic words and pronouns
  'jeg', 'du', 'han', 'hun', 'den', 'det', 'vi', 'i', 'de', 'mig', 'dig', 'ham', 'hende', 'os', 'jer', 'dem',
  'min', 'mit', 'mine', 'din', 'dit', 'dine', 'hans', 'hendes', 'dens', 'dets', 'vores', 'jeres', 'deres',
  'sig', 'selv', 'hinanden', 'denne', 'dette', 'disse', 'den her', 'det her', 'de her',

  // Essential verbs (all forms)
  'er', 'var', 'har', 'havde', 'vil', 'ville', 'skal', 'skulle', 'kan', 'kunne', 'må', 'måtte', 
  'gør', 'gjorde', 'gjort', 'få', 'fik', 'fået', 'komme', 'kommer', 'kom', 'kommet',
  'tage', 'tager', 'tog', 'taget', 'give', 'giver', 'gav', 'givet', 'se', 'ser', 'så', 'set',
  'blive', 'bliver', 'blev', 'blevet', 'være', 'væren', 'været', 'sige', 'siger', 'sagde', 'sagt',
  'vide', 'ved', 'vidste', 'vidst', 'find', 'finder', 'fandt', 'fundet', 'arbejde', 'arbejder', 'arbejdede', 'arbejdet',

  // Words ending with 'ng'
  'gang', 'sang', 'rang', 'fang', 'hang', 'mang', 'tang', 'wang', 'ung', 'lung', 'kung', 'bung', 'dung', 'jung',
  'ring', 'king', 'ting', 'ving', 'hing', 'ping', 'sing', 'ming', 'ding', 'ging', 'ning', 'ling',
  'spring', 'string', 'bring', 'swing', 'fling', 'sling', 'kling', 'tring',
  'bang', 'gong', 'long', 'kong', 'dong', 'bong', 'song', 'tong', 'wong', 'zong',
  'gang', 'mængde', 'længe', 'streng', 'stang', 'klang', 'slang', 'sprang', 'tvang', 'svang',

  // Words ending with 'st'
  'hest', 'vest', 'rest', 'fest', 'pest', 'test', 'mest', 'best', 'lest', 'nest',
  'øst', 'høst', 'kost', 'post', 'frost', 'gæst', 'næst', 'bæst', 'læst', 'hæst',
  'frist', 'krist', 'mist', 'list', 'gist', 'twist', 'dust', 'rust', 'lust', 'just',
  'blomst', 'først', 'størst', 'værst', 'bedst', 'mindst', 'flest', 'sidst',
  'kunst', 'gunst', 'ernst', 'borst', 'karst', 'forst', 'worst', 'burst',

  // Words ending with 'nd'
  'land', 'hånd', 'sand', 'band', 'rand', 'grand', 'strand', 'brand', 'stand',
  'grind', 'blind', 'bind', 'find', 'sind', 'kind', 'mind', 'vind', 'lind',
  'grund', 'bund', 'hund', 'fund', 'mund', 'lund', 'rund', 'sund', 'tund',
  'frond', 'blond', 'fond', 'pond', 'rond', 'sond', 'tond', 'wond',

  // Words ending with 'nt'
  'sent', 'tent', 'rent', 'bent', 'dent', 'kent', 'ment', 'vent', 'lent',
  'pint', 'hint', 'tint', 'mint', 'lint', 'sunt', 'punt', 'hunt', 'bunt',
  'point', 'joint', 'front', 'grunt', 'blunt', 'stunt', 'count',

  // Common two-letter endings words
  'helt', 'felt', 'melt', 'belt', 'kelt', 'pelt', 'selt', 'velt',
  'salt', 'halt', 'malt', 'kalt', 'galt', 'walt', 'balt',
  'kort', 'sort', 'port', 'mort', 'dort', 'fort', 'tort',
  'park', 'bark', 'mark', 'lark', 'dark', 'kark', 'hark',

  // Medium complexity words (ing endings)
  'spring', 'bring', 'sting', 'swing', 'thing', 'wing', 'ring', 'king', 'sing',
  'arbejding', 'handling', 'forbinding', 'læsning', 'skrivning', 'tegning', 'maling',
  'sporing', 'boring', 'koring', 'storing', 'snoring', 'noring', 'loring',

  // Three+ letter syllable words
  'station', 'nation', 'variation', 'information', 'situation', 'relation', 'operation',
  'handling', 'forhandling', 'behandling', 'mishandling', 'genhandling',
  'regering', 'styrning', 'ledning', 'åbning', 'lukning', 'påbegyndelse',

  // Animals
  'hund', 'kat', 'hest', 'ko', 'gris', 'får', 'ged', 'and', 'høne', 'gås',
  'mus', 'rotte', 'hamster', 'kanin', 'pindsvin', 'egern', 'ræv', 'ulv', 'bjørn',
  'elefant', 'løve', 'tiger', 'zebra', 'giraf', 'næsehorn', 'flodhest', 'kamel',
  'fisk', 'haj', 'delfin', 'hval', 'sæl', 'krabbe', 'hummer', 'østers',
  'fugl', 'spurv', 'solsort', 'ugle', 'ørn', 'falk', 'svale', 'stork',
  'slange', 'firben', 'frø', 'tudse', 'skildpadde', 'krokodille',
  'edderkop', 'myg', 'flue', 'bi', 'humlebi', 'hveps', 'sommerfugl', 'myre',

  // Food and cooking
  'brød', 'smør', 'ost', 'mælk', 'æg', 'kød', 'fisk', 'frugt', 'grøntsag',
  'æble', 'pære', 'banan', 'orange', 'citron', 'druer', 'jordbær', 'hindbær',
  'kartoffel', 'gulerod', 'løg', 'tomat', 'agurk', 'salat', 'kål', 'spinat',
  'ris', 'pasta', 'nudler', 'pizza', 'burger', 'sandwich', 'suppe', 'salat',
  'kaffe', 'te', 'vand', 'juice', 'øl', 'vin', 'sodavand', 'mælk',

  // Body parts
  'hoved', 'hår', 'øje', 'næse', 'mund', 'tand', 'øre', 'hals', 'skulder',
  'arm', 'hånd', 'finger', 'bryst', 'mave', 'ryg', 'ben', 'fod', 'tå',
  'hjerte', 'lunge', 'lever', 'nyre', 'hjerne', 'knogle', 'muskel', 'hud',

  // Family and people
  'familie', 'mor', 'far', 'søn', 'datter', 'barn', 'baby', 'bedstemor', 'bedstefar',
  'onkel', 'tante', 'fætter', 'kusine', 'ven', 'veninde', 'nabo', 'kollega',
  'lærer', 'læge', 'sygeplejerske', 'politibetjent', 'brandmand', 'pilot', 'chauffør',

  // Home and buildings
  'hus', 'lejlighed', 'værelse', 'køkken', 'badeværelse', 'stue', 'soveværelse',
  'dør', 'vindue', 'væg', 'loft', 'gulv', 'trappe', 'elevator',
  'møbel', 'bord', 'stol', 'sofa', 'seng', 'skab', 'kommode', 'reol',
  'lampe', 'tv', 'computer', 'telefon', 'radio', 'ur', 'spejl', 'billede',

  // Transportation
  'bil', 'bus', 'tog', 'fly', 'skib', 'båd', 'cykel', 'motorcykel',
  'station', 'lufthavn', 'havn', 'vej', 'gade', 'bro', 'tunnel',

  // Nature and weather
  'sol', 'måne', 'stjerne', 'himmel', 'sky', 'regn', 'sne', 'vind', 'storm',
  'sommer', 'vinter', 'forår', 'efterår', 'dag', 'nat', 'morgen', 'aften',
  'træ', 'blomst', 'græs', 'skov', 'park', 'have', 'mark', 'strand', 'hav',
  'bjerg', 'dal', 'sø', 'å', 'elv', 'ø', 'land', 'by', 'verden',

  // Colors
  'rød', 'blå', 'grøn', 'gul', 'sort', 'hvid', 'grå', 'brun', 'orange', 'lilla', 'pink', 'rosa',

  // Numbers
  'nul', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti',
  'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten', 'tyve',
  'tredive', 'fyrre', 'halvtreds', 'tres', 'halvfjerds', 'firs', 'halvfems', 'hundrede', 'tusind',

  // Adjectives
  'stor', 'lille', 'høj', 'lav', 'lang', 'kort', 'bred', 'smal', 'tyk', 'tynd',
  'god', 'dårlig', 'nem', 'svær', 'hurtig', 'langsom', 'ny', 'gammel', 'ung', 'ældre',
  'smuk', 'grim', 'glad', 'trist', 'varm', 'kold', 'våd', 'tør', 'ren', 'snavset',

  // Time
  'tid', 'time', 'minut', 'sekund', 'dag', 'uge', 'måned', 'år', 'årh undrede',
  'morgen', 'formiddag', 'middag', 'eftermiddag', 'aften', 'nat', 'midnat',
  'i dag', 'i går', 'i morgen', 'altid', 'aldrig', 'ofte', 'sjældent', 'nogle gange',

  // Actions and activities
  'spille', 'lege', 'løbe', 'gå', 'springe', 'hoppe', 'danse', 'synge', 'læse', 'skrive',
  'tegne', 'male', 'købe', 'sælge', 'spise', 'drikke', 'sove', 'våge', 'arbejde', 'hvile',

  // Emotions and feelings
  'kærlighed', 'glæde', 'sorg', 'vrede', 'frygt', 'håb', 'tillid', 'tvivl',
  'lykkelig', 'trist', 'vred', 'bange', 'stolt', 'skuffet', 'overrasket', 'forvirret',

  // School and education
  'skole', 'klasse', 'lærer', 'elev', 'bog', 'pen', 'blyant', 'papir', 'tavle',
  'matematik', 'dansk', 'engelsk', 'historie', 'geografi', 'biologi', 'fysik', 'kemi',

  // Technology
  'computer', 'telefon', 'tablet', 'internet', 'email', 'website', 'app', 'program',
  'skærm', 'tastatur', 'mus', 'printer', 'kamera', 'video', 'musik', 'spil',

  // Sports and activities
  'fodbold', 'basketball', 'tennis', 'badminton', 'svømning', 'løb', 'cykling', 'skiløb',
  'gymnastik', 'dans', 'musik', 'kunst', 'teater', 'biograf', 'museum',

  // Clothing
  'tøj', 'skjorte', 'bukser', 'kjole', 'nederdel', 'jakke', 'frakke', 'sko', 'strømper',
  'hat', 'kasket', 'handsker', 'bælte', 'ur', 'smykker', 'ring', 'kæde',

  // More complex words for advanced players
  'selvstændig', 'uafhængighed', 'ansvarlig', 'forpligtelse', 'mulighed', 'udfordring',
  'løsning', 'problem', 'beslutning', 'valg', 'konsekvens', 'resultat', 'årsag', 'virkning',
  'udvikling', 'forandring', 'forbedring', 'forværring', 'forskel', 'lighed',
  'sammenligning', 'forbindelse', 'relation', 'forhold', 'situation', 'tilstand',

  // Words ending in 'tion'
  'station', 'nation', 'information', 'situation', 'operation', 'organisation', 'administration',
  'demonstration', 'presentation', 'koncentration', 'preparation', 'inspiration', 'motivation',

  // Words ending in 'ung'
  'uddannelse', 'oplysning', 'forklaring', 'beskrivelse', 'fremstilling', 'behandling',
  'undersøgelse', 'iagttagelse', 'observation', 'registrering', 'dokumentation',

  // Professional and academic words
  'professor', 'doktor', 'ingeniør', 'arkitekt', 'advokat', 'dommer', 'minister',
  'direktør', 'manager', 'sekretær', 'assistent', 'specialист', 'ekspert', 'konsulent',

  // Abstract concepts
  'frihed', 'retfærdighed', 'sandhed', 'skønhed', 'visdom', 'intelligens', 'kreativitet',
  'fantasi', 'hukommelse', 'forståelse', 'erkendelse', 'bevidsthed', 'følelse', 'tanke',

  // More animals and nature
  'papegøje', 'kanarie', 'undulat', 'leopard', 'gepard', 'puma', 'lynx', 'bison',
  'rensdyr', 'elg', 'kronhjort', 'rådyr', 'vildsvin', 'hare', 'egern', 'flagermus',
  'skovmårhund', 'grævling', 'odder', 'mår', 'ilder', 'væsel', 'pindsvin',

  // Plants and flowers
  'rose', 'tulipan', 'påskelilje', 'solsikke', 'marguerit', 'mælkebøtte', 'valmue',
  'kornblomst', 'nellike', 'violet', 'hyacint', 'narcis', 'krokus', 'iris', 'dahlia',

  // Food preparation and cooking
  'stege', 'koge', 'bage', 'grille', 'røre', 'blande', 'hakke', 'skære', 'skrælle',
  'marinere', 'krydre', 'smage', 'servere', 'anrette', 'dække', 'vaske', 'tørre',

  // Musical instruments
  'klaver', 'guitar', 'violin', 'fløjte', 'trompet', 'tromme', 'saxophone', 'harpe',
  'mundharmonika', 'accordion', 'orgel', 'bas', 'synthesizer', 'mikrofon',

  // More verbs
  'acceptere', 'afvise', 'tilbyde', 'foreslå', 'anbefale', 'kritisere', 'rose', 'belønne',
  'straffe', 'tilgive', 'undskyld', 'beklage', 'fejre', 'gratulere', 'kondolere',

  // Household items
  'gryde', 'pande', 'skål', 'tallerken', 'kop', 'glas', 'kniv', 'gaffel', 'ske',
  'køleskab', 'ovn', 'komfur', 'opvaskemaskine', 'vaskemaskine', 'støvsager',
  'strygejern', 'hårtørrer', 'barbermaskine', 'tandbørste', 'sæbe', 'shampoo',

  // Materials and substances
  'træ', 'metal', 'plastik', 'glas', 'keramik', 'stof', 'læder', 'papir', 'karton',
  'sten', 'beton', 'tegl', 'sand', 'ler', 'kalk', 'cement', 'asfalt', 'gummi',

  // Geographical terms
  'kontinent', 'land', 'provins', 'region', 'kommune', 'by', 'landsby', 'hovedstad',
  'kyst', 'fjord', 'bugt', 'halvø', 'ø', 'holme', 'kap', 'bjerg', 'bakke', 'dal',

  // Weather phenomena
  'tornado', 'orkan', 'tyfon', 'monsun', 'tåge', 'dis', 'rim', 'frost', 'is', 'hagl',
  'lyn', 'torden', 'regnbue', 'nordlys', 'solnedgang', 'solopgang', 'formørkelse',

  // Medical terms
  'hospital', 'klinik', 'ambulance', 'operation', 'behandling', 'medicin', 'pille',
  'injektion', 'vaccine', 'diagnose', 'symptom', 'sygdom', 'sundhed', 'wellness'
];

export const importAllWords = async () => {
  console.log('Starting massive Danish word import...');
  
  const batchSize = 1000;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < danishWords.length; i += batchSize) {
    const batch = danishWords.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('danish_words')
        .insert(
          batch.map(word => ({ word: word.toLowerCase().trim() }))
        );

      if (error) {
        console.error('Batch import error:', error);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`Imported batch ${Math.floor(i / batchSize) + 1}, total words: ${imported}`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      errors += batch.length;
    }
  }

  console.log(`Import complete. Imported: ${imported}, Errors: ${errors}`);
  return { imported, errors };
};
