(() => {
  const patterns = [
    { id: 'short-a', sound: '/æ/', grapheme: 'a', label: 'short a', words: ['cat','map','hand','black','clap','flag','plant','sand','crab','stamp','snack','track','glass','grass','flat','bat','bag','cap','jam','rabbit'] },
    { id: 'short-e', sound: '/ɛ/', grapheme: 'e', label: 'short e', words: ['bed','hen','red','step','dress','shell','smell','nest','tent','help','pen','wet','left','best','neck','bell','egg','fence','sled','lemon'] },
    { id: 'short-i', sound: '/ɪ/', grapheme: 'i', label: 'short i', words: ['sit','fish','milk','ring','hill','slip','brick','grin','stick','swim','gift','list','wind','picnic','kitten','insect','mitten','spill','twist','quick'] },
    { id: 'short-o', sound: '/ɑ/', grapheme: 'o', label: 'short o', words: ['hot','dog','top','frog','clock','stop','rock','pond','shop','sock','block','spot','fox','mop','lost','drop','job','pot','not','robin'] },
    { id: 'short-u', sound: '/ʌ/', grapheme: 'u', label: 'short u', words: ['sun','cup','mud','jump','duck','run','brush','drum','truck','lunch','plum','stuck','rug','bus','hunt','bump','fun','gum','shut','must'] },
    { id: 'short-u-o', sound: '/ʌ/', grapheme: 'o', label: 'short u sound with o', words: ['honey','nothing','dove','shovel','won','month','other','glove','mother','cover','brother','money','love','above','come','some','done','none','son','front'] },
    { id: 'consonant-b', sound: '/b/', grapheme: 'b', label: 'b', words: ['bat','bed','big','box','bus','back','ball','book','boat','blue','baby','rabbit','cabin','table','number','about','before','below','bright','brother'] },
    { id: 'hard-c', sound: '/k/', grapheme: 'c', label: 'hard c', words: ['cat','cup','cold','can','coat','crab','clap','clock','cake','corn','camp','call','class','clean','cloud','music','picnic','school','because','color'] },
    { id: 'soft-c', sound: '/s/', grapheme: 'c', label: 'soft c', words: ['city','cent','cell','face','race','ice','pencil','place','dance','fence','space','center','circle','cycle','price','voice','juice','once','nice','December'] },
    { id: 'consonant-d', sound: '/d/', grapheme: 'd', label: 'd', words: ['dog','day','did','door','down','desk','duck','dark','drum','dress','hand','bed','red','mud','ride','under','garden','today','friend','middle'] },
    { id: 'consonant-f', sound: '/f/', grapheme: 'f', label: 'f', words: ['fan','fish','fun','fox','farm','food','feet','flag','frog','fresh','leaf','roof','soft','left','after','before','family','flower','friend','safe'] },
    { id: 'hard-g', sound: '/ɡ/', grapheme: 'g', label: 'hard g', words: ['go','get','give','girl','gift','goat','gum','garden','game','green','glass','frog','bag','dog','flag','plug','begin','again','tiger','wagon'] },
    { id: 'soft-g', sound: '/dʒ/', grapheme: 'g', label: 'soft g', words: ['gem','gentle','giraffe','giant','gym','magic','page','cage','age','huge','orange','energy','engine','angel','danger','region','imagine','village','stage','general'] },
    { id: 'consonant-h', sound: '/h/', grapheme: 'h', label: 'h', words: ['hat','hen','hot','home','hand','help','hill','hop','house','horse','happy','honey','hello','behind','ahead','perhaps','whole','helmet','who','human'] },
    { id: 'consonant-j', sound: '/dʒ/', grapheme: 'j', label: 'j', words: ['jam','jet','job','jump','just','jar','joke','jelly','jeans','juice','jacket','jungle','July','enjoy','object','subject','project','jolly','jewel','adjust'] },
    { id: 'consonant-k', sound: '/k/', grapheme: 'k', label: 'k', words: ['kit','kid','king','keep','kite','kind','kitchen','kitten','skate','skin','sky','ask','mask','milk','book','look','take','make','like','bike'] },
    { id: 'consonant-l', sound: '/l/', grapheme: 'l', label: 'l', words: ['leg','lip','log','lamp','long','look','love','leaf','lake','line','blue','clap','flag','milk','help','ball','girl','play','little','yellow'] },
    { id: 'consonant-m', sound: '/m/', grapheme: 'm', label: 'm', words: ['map','man','mud','moon','milk','make','mouse','more','much','mother','smile','small','drum','game','home','time','summer','animal','family','come'] },
    { id: 'consonant-n', sound: '/n/', grapheme: 'n', label: 'n', words: ['net','nose','name','night','nine','nice','nest','new','near','never','sun','hand','rain','green','find','under','animal','friend','nothing','window'] },
    { id: 'consonant-p', sound: '/p/', grapheme: 'p', label: 'p', words: ['pan','pen','pig','pot','cup','map','hop','open','paper','paint','play','plant','please','purple','happy','apple','help','sleep','jump','people'] },
    { id: 'qu', sound: '/kw/', grapheme: 'qu', label: 'qu', words: ['queen','quick','quiet','quit','quiz','question','quite','quarter','quote','quilt','quack','squid','squirt','square','equal','liquid','request','require','equipment','quality'] },
    { id: 'consonant-r', sound: '/r/', grapheme: 'r', label: 'r', words: ['run','red','rain','road','room','rock','rabbit','right','rope','river','crab','frog','green','tree','brush','friend','around','carry','story','three'] },
    { id: 'consonant-s', sound: '/s/', grapheme: 's', label: 's', words: ['sun','sit','see','say','sand','sock','soap','song','star','stop','best','bus','house','mouse','class','smile','school','sister','small','grass'] },
    { id: 's-as-z', sound: '/z/', grapheme: 's', label: 's sounding like z', words: ['is','as','has','his','was','these','those','easy','busy','nose','rose','please','music','visit','reason','season','cousin','present','design','because'] },
    { id: 'consonant-t', sound: '/t/', grapheme: 't', label: 't', words: ['top','ten','time','two','take','table','tail','town','tree','train','cat','hot','sit','stop','star','after','water','little','today','student'] },
    { id: 'consonant-v', sound: '/v/', grapheme: 'v', label: 'v', words: ['van','vet','very','voice','visit','vase','vest','vine','vote','vowel','five','give','have','love','move','over','seven','river','never','every'] },
    { id: 'consonant-w', sound: '/w/', grapheme: 'w', label: 'w', words: ['we','wet','win','was','way','water','wall','wind','wood','word','swim','swing','away','always','between','warm','wake','sweet','twice','window'] },
    { id: 'consonant-x', sound: '/ks/', grapheme: 'x', label: 'x', words: ['box','fox','six','mix','fix','wax','tax','next','text','extra','expect','explain','excited','exercise','example','relax','complex','index','maximum','sixteen'] },
    { id: 'consonant-y', sound: '/j/', grapheme: 'y', label: 'consonant y', words: ['yes','you','yet','yellow','yard','yarn','year','yell','yawn','young','yummy','yo-yo','yogurt','yesterday','youth','your','beyond','canyon','banyan','lawyer'] },
    { id: 'consonant-z', sound: '/z/', grapheme: 'z', label: 'z', words: ['zoo','zip','zap','zero','zebra','zone','zoom','lazy','crazy','fuzzy','buzz','puzzle','prize','freeze','dozen','lizard','amazing','quiz','maze','blaze'] },
    { id: 'sh', sound: '/ʃ/', grapheme: 'sh', label: 'sh', words: ['ship','shop','shut','shell','fish','dish','wish','brush','crash','fresh','sheep','shirt','shark','shape','shine','short','shovel','finish','splash','trash'] },
    { id: 'ch', sound: '/tʃ/', grapheme: 'ch', label: 'ch', words: ['chip','chop','chin','chest','lunch','bench','rich','much','teach','chair','cheese','child','chicken','beach','peach','coach','speech','branch','march','torch'] },
    { id: 'ch-as-k', sound: '/k/', grapheme: 'ch', label: 'ch sounding like k', words: ['chorus','choir','school','ache','stomach','echo','anchor','chemist','chemistry','character','chrome','chlorine','Christmas','technology','mechanic','orchestra','scheme','scholar','headache','monarch'] },
    { id: 'tch', sound: '/tʃ/', grapheme: 'tch', label: 'tch', words: ['match','catch','patch','hatch','batch','watch','fetch','stretch','itch','witch','switch','kitchen','stitch','scratch','latch','ditch','notch','butcher','pitcher','catcher'] },
    { id: 'ck', sound: '/k/', grapheme: 'ck', label: 'ck', words: ['back','black','duck','rock','clock','stick','snack','truck','neck','sock','pick','kick','luck','lock','pack','check','brick','block','track','quick'] },
    { id: 'dge', sound: '/dʒ/', grapheme: 'dge', label: 'dge', words: ['bridge','edge','badge','fudge','judge','ridge','fridge','pledge','hedge','wedge','ledge','dodge','nudge','budge','lodge','porridge','sledge','midge','knowledge','hedgehog'] },
    { id: 'ff', sound: '/f/', grapheme: 'ff', label: 'ff', words: ['off','coffee','stuff','cliff','puff','muffin','different','traffic','office','offer','effect','difficult','suffer','fluffy','waffle','giraffe','sniff','stiff','cuff','toffee'] },
    { id: 'kn', sound: '/n/', grapheme: 'kn', label: 'silent k with kn', words: ['know','knee','knife','knight','knit','knock','knot','knob','kneel','knuckle','knack','knoll','knead','knapsack','known','knowing','kneeling','knitting','knotted','knighthood'] },
    { id: 'wr', sound: '/r/', grapheme: 'wr', label: 'silent w with wr', words: ['write','wrist','wrong','wrap','wreck','wren','wrench','wring','wrinkle','wrote','written','writer','writing','wrapping','wreath','wrestle','wrapper','wrongly','wrung','wristwatch'] },
    { id: 'nk', sound: '/ŋk/', grapheme: 'nk', label: 'nk', words: ['bank','sink','pink','think','thank','trunk','drink','blank','chunk','monkey','donkey','ankle','blink','wink','tank','link','junk','plank','skunk','honk'] },
    { id: 'll', sound: '/l/', grapheme: 'll', label: 'll', words: ['ball','bell','bill','doll','full','hill','will','tell','shell','smell','small','yellow','hello','follow','allow','pillow','jelly','silly','spell','still'] },
    { id: 'mm', sound: '/m/', grapheme: 'mm', label: 'mm', words: ['summer','hammer','common','swimming','humming','yummy','mammal','comma','comment','command','community','roommate','teammate','grammar','drummer','mummy','dummy','immerse','immense','hammock'] },
    { id: 'nn', sound: '/n/', grapheme: 'nn', label: 'nn', words: ['funny','sunny','running','dinner','winner','bunny','tennis','cannot','penny','tunnel','banner','bonnet','channel','connect','inner','manner','runner','skinny','announced','annoy'] },
    { id: 'pp', sound: '/p/', grapheme: 'pp', label: 'pp', words: ['happy','apple','puppy','happen','hopping','shopping','support','suppose','upper','ripple','supper','slipper','copper','pepper','appear','opposite','appointment','wrapping','clapping','dropping'] },
    { id: 'rr', sound: '/r/', grapheme: 'rr', label: 'rr', words: ['berry','carry','hurry','mirror','sorry','parrot','borrow','arrow','cherry','carrot','barrel','ferry','merry','narrow','terrible','worry','correct','current','arrive','surround'] },
    { id: 'ss', sound: '/s/', grapheme: 'ss', label: 'ss', words: ['less','press','dress','stress','class','glass','grass','cross','miss','kiss','mess','boss','across','lesson','message','possible','blossom','fossil','chess','address'] },
    { id: 'tt', sound: '/t/', grapheme: 'tt', label: 'tt', words: ['little','letter','better','butter','kitten','sitting','bottle','matter','button','pretty','cotton','attic','cattle','mittens','pattern','rattle','written','lettuce','bottom','settle'] },
    { id: 'wh', sound: '/w/', grapheme: 'wh', label: 'wh', words: ['what','when','where','why','which','while','whale','wheat','whisper','whistle','white','wheel','whisker','whip','whirl','whenever','whether','somewhere','nowhere','meanwhile'] },
    { id: 'tion', sound: '/ʃən/', grapheme: 'tion', label: 'tion', words: ['action','station','nation','motion','lotion','option','section','portion','mention','fiction','direction','collection','vacation','education','attention','invention','information','celebration','addition','subtraction'] },
    { id: 'sion-zh', sound: '/ʒən/', grapheme: 'sion', label: 'sion as in vision', words: ['vision','television','decision','division','revision','explosion','confusion','occasion','conclusion','inclusion','exclusion','invasion','collision','version','conversion','persuasion','erosion','fusion','illusion','provision'] },
    { id: 'sion-sh', sound: '/ʃən/', grapheme: 'sion', label: 'sion as in mission', words: ['mission','passion','session','expression','discussion','permission','admission','profession','impression','possession','procession','compression','depression','succession','obsession','aggression','confession','submission','transmission','expansion'] },
    { id: 'ng', sound: '/ŋ/', grapheme: 'ng', label: 'ng', words: ['sing','ring','king','wing','song','long','strong','thing','bring','spring','swing','sting','string','morning','nothing','young','bang','hung','lung','gong'] },
    { id: 'unvoiced-th', sound: '/θ/', grapheme: 'th', label: 'quiet th', words: ['thin','thick','thumb','bath','math','moth','path','teeth','tooth','three','thank','think','thorn','thread','throw','throat','nothing','month','north','earth'] },
    { id: 'voiced-th', sound: '/ð/', grapheme: 'th', label: 'buzzy th', words: ['this','that','these','those','them','then','there','they','their','mother','father','brother','other','another','together','weather','feather','leather','either','breathe'] },
    { id: 'long-a-ai', sound: '/eɪ/', grapheme: 'ai', label: 'long a with ai', words: ['rain','mail','tail','sail','train','paint','chain','brain','grain','snail','wait','paid','afraid','explain','remain','detail','trail','nail','pail','aim'] },
    { id: 'long-a-ay', sound: '/eɪ/', grapheme: 'ay', label: 'long a with ay', words: ['day','play','say','may','way','stay','gray','clay','tray','spray','away','today','Sunday','crayon','player','payment','daylight','always','maybe','hallway'] },
    { id: 'long-e-ee', sound: '/iː/', grapheme: 'ee', label: 'long e with ee', words: ['see','tree','green','feet','sheep','sleep','street','seed','need','week','keep','deep','free','three','cheese','teeth','screen','queen','between','weekend'] },
    { id: 'long-e-ea', sound: '/iː/', grapheme: 'ea', label: 'long e with ea', words: ['eat','sea','read','team','clean','dream','beach','peach','teach','leaf','meat','seat','speak','please','reach','steam','cream','each','meal','bead'] },
    { id: 'long-i-igh', sound: '/aɪ/', grapheme: 'igh', label: 'long i with igh', words: ['high','night','light','right','fight','sight','tight','might','bright','flight','slight','fright','knight','midnight','sunlight','flashlight','lightning','highway','nighttime','delight'] },
    { id: 'long-o-oa', sound: '/oʊ/', grapheme: 'oa', label: 'long o with oa', words: ['boat','coat','road','soap','goat','float','throat','toast','coach','loaf','oak','goal','coal','foam','roast','load','groan','approach','oatmeal','toad'] },
    { id: 'long-a-open', sound: '/eɪ/', grapheme: 'a', label: 'long a with a', words: ['acorn','apron','agent','able','table','paper','baby','lady','basic','bacon','basin','major','nature','danger','angel','range','later','favorite','radio','potato'] },
    { id: 'schwa-a', sound: '/ə/', grapheme: 'a', label: 'unstressed a', words: ['about','ago','away','alone','alive','around','above','again','along','across','adopt','arise','asleep','afraid','amaze','account','amount','allow','among','apart'] },
    { id: 'long-e-open', sound: '/iː/', grapheme: 'e', label: 'long e with e', words: ['he','she','we','me','be','even','equal','evil','legal','secret','these','complete','theme','meter','media','hero','fever','recent','region','female'] },
    { id: 'long-i-open', sound: '/aɪ/', grapheme: 'i', label: 'long i with i', words: ['find','kind','mind','child','wild','blind','behind','climb','sign','title','tiger','spider','final','quiet','pilot','idea','iron','item','island','Friday'] },
    { id: 'long-o-open', sound: '/oʊ/', grapheme: 'o', label: 'long o with o', words: ['no','go','so','most','both','old','cold','told','open','over','only','post','host','hotel','local','moment','focus','robot','bonus','solar'] },
    { id: 'long-u-yoo', sound: '/juː/', grapheme: 'u', label: 'long u as yoo', words: ['use','unit','music','human','cute','huge','student','future','computer','usual','united','unicorn','uniform','tulip','cupid','fume','tube','cube','mule','menu'] },
    { id: 'u-as-book', sound: '/ʊ/', grapheme: 'u', label: 'u as in put', words: ['put','push','pull','full','bush','bull','bullet','butcher','cushion','pudding','sugar','should','would','could','bushel','ambush','bully','pulley','pulpit','pushy'] },
    { id: 'y-long-e', sound: '/iː/', grapheme: 'y', label: 'y as long e', words: ['happy','sunny','funny','city','baby','lady','candy','story','family','money','honey','puppy','party','body','easy','ready','very','any','many','only'] },
    { id: 'y-short-i', sound: '/ɪ/', grapheme: 'y', label: 'y as short i', words: ['gym','system','symbol','mystery','crystal','typical','syllable','lyrics','myth','gymnast','oxygen','cylinder','rhythm','physics','pyramid','syrup','lynx','cyst','syntax','cygnet'] },
    { id: 'y-long-i', sound: '/aɪ/', grapheme: 'y', label: 'y as long i', words: ['my','by','try','cry','fly','sky','dry','why','shy','spy','fry','reply','deny','rely','apply','supply','multiply','identify','cycle','style'] },
    { id: 'long-a-split', sound: '/eɪ/', grapheme: 'a_e', label: 'long a with a_e', words: ['cake','make','name','game','same','late','gate','plate','shape','brave','snake','grape','flame','skate','trade','plane','space','chase','whale','grade'] },
    { id: 'long-i-split', sound: '/aɪ/', grapheme: 'i_e', label: 'long i with i_e', words: ['bike','time','five','kite','line','ride','smile','white','slide','drive','prize','shine','while','stripe','spine','bride','crime','hide','pile','nine'] },
    { id: 'long-o-split', sound: '/oʊ/', grapheme: 'o_e', label: 'long o with o_e', words: ['home','hope','nose','rose','note','rope','stone','phone','those','close','broke','drove','smoke','globe','joke','bone','hole','chose','stove','froze'] },
    { id: 'r-ar', sound: '/ɑr/', grapheme: 'ar', label: 'r-controlled ar', words: ['car','far','star','arm','farm','park','dark','hard','card','yard','bark','sharp','scarf','start','march','garden','carpet','market','artist','barn'] },
    { id: 'r-or', sound: '/ɔr/', grapheme: 'or', label: 'r-controlled or', words: ['for','corn','fork','horse','short','storm','born','morning','north','sport','porch','torch','story','order','forest','forty','corner','shore','more','before'] },
    { id: 'r-er', sound: '/ɝ/', grapheme: 'er', label: 'r-controlled er', words: ['her','term','fern','germ','herd','serve','person','perfect','nervous','certain','mercy','verse','stern','perch','clerk','jerk','verb','kernel','service','mermaid'] },
    { id: 'unstressed-er', sound: '/ɚ/', grapheme: 'er', label: 'unstressed er', words: ['water','mother','father','brother','sister','teacher','better','after','under','over','river','flower','paper','tiger','spider','winter','summer','number','letter','farmer'] },
    { id: 'or-as-er', sound: '/ɝ/', grapheme: 'or', label: 'or as in world', words: ['word','work','world','worm','worse','worst','worth','worthy','worker','working','workshop','homework','artwork','network','wormy','worldly','wordless','workbook','workday','workplace'] },
    { id: 'r-ir', sound: '/ɝ/', grapheme: 'ir', label: 'r-controlled ir', words: ['bird','girl','shirt','first','third','dirt','stir','skirt','birth','chirp','firm','thirsty','circle','twirl','swirl','squirt','confirm','thirteen','birthday','squirrel'] },
    { id: 'r-ur', sound: '/ɝ/', grapheme: 'ur', label: 'r-controlled ur', words: ['turn','burn','hurt','curl','fur','nurse','purple','turtle','Thursday','burst','church','surf','purse','curve','return','turkey','burger','curtain','further','sturdy'] },
    { id: 'air', sound: '/ɛr/', grapheme: 'air', label: 'air', words: ['air','hair','fair','pair','chair','stairs','airport','airplane','fairy','dairy','repair','unfair','haircut','aircraft','airline','airmail','chairman','fairly','hairy','staircase'] },
    { id: 'are-air', sound: '/ɛr/', grapheme: 'are', label: 'are as in care', words: ['care','share','aware','rare','scared','careful','prepare','compare','dare','spare','bare','square','stare','flare','glare','snare','nightmare','hardware','software','daycare'] },
    { id: 'ear-near', sound: '/ɪr/', grapheme: 'ear', label: 'ear as in near', words: ['near','clear','fear','dear','gear','rear','ears','beard','spear','weary','nearby','nearly','clearly','clearing','fearful','appear','disappear','year','hear','hearing'] },
    { id: 'eer', sound: '/ɪr/', grapheme: 'eer', label: 'eer', words: ['deer','cheer','peer','sheer','steer','career','engineer','volunteer','pioneer','reindeer','cheers','cheerful','steering','peers','careers','engineers','volunteers','beers','sneer','veer'] },
    { id: 'err-air', sound: '/ɛr/', grapheme: 'err', label: 'err as in berry', words: ['berry','cherry','ferry','merry','strawberry','blackberry','raspberry','terrible','territory','terror','error','errors','terrier','terrify','terrified','terrifying','terribly','terrorist','terrorism','territorial'] },
    { id: 'ow-cow', sound: '/aʊ/', grapheme: 'ow', label: 'ow as in cow', words: ['cow','how','now','down','town','brown','clown','crown','flower','shower','power','towel','owl','growl','frown','allow','powder','tower','vowel','cowboy'] },
    { id: 'ow-snow', sound: '/oʊ/', grapheme: 'ow', label: 'ow as in snow', words: ['own','snow','grow','throw','show','know','slow','flow','blow','glow','follow','window','yellow','shadow','rainbow','below','elbow','pillow','tomorrow','sparrow'] },
    { id: 'aw', sound: '/ɔ/', grapheme: 'aw', label: 'aw', words: ['saw','draw','law','paw','raw','straw','claw','yawn','crawl','hawk','lawn','dawn','shawl','jaw','awful','drawer','awning','thaw','sawdust','strawberry'] },
    { id: 'ou-cloud', sound: '/aʊ/', grapheme: 'ou', label: 'ou as in cloud', words: ['out','loud','cloud','house','mouse','round','sound','found','ground','count','mouth','south','shout','about','mountain','thousand','bounce','outside','proud','couch'] },
    { id: 'oi', sound: '/ɔɪ/', grapheme: 'oi', label: 'oi', words: ['coin','boil','soil','oil','join','point','voice','choice','noise','spoil','moist','toilet','poison','avoid','joint','foil','coil','broil','hoist','oink'] },
    { id: 'oy', sound: '/ɔɪ/', grapheme: 'oy', label: 'oy', words: ['boy','toy','joy','soy','annoy','enjoy','cowboy','oyster','royal','loyal','voyage','destroy','employ','joyful','boyhood','toying','enjoyment','loyalty','royalty','coy'] },
    { id: 'au', sound: '/ɔ/', grapheme: 'au', label: 'au', words: ['author','August','autumn','launch','fault','sauce','pause','cause','haunt','laundry','haul','vault','because','astronaut','automatic','auction','audience','audio','dinosaur','sausage'] },
    { id: 'ie-long-e', sound: '/iː/', grapheme: 'ie', label: 'ie as long e', words: ['piece','field','chief','brief','grief','thief','niece','priest','believe','relief','shield','yield','cookie','rookie','movie','brownie','collie','prairie','retrieve','achieve'] },
    { id: 'ey-long-e', sound: '/iː/', grapheme: 'ey', label: 'ey as long e', words: ['key','honey','money','monkey','donkey','turkey','chimney','valley','trolley','journey','hockey','jockey','kidney','whiskey','alley','barley','parsley','volley','jersey','abbey'] },
    { id: 'oo-moon', sound: '/uː/', grapheme: 'oo', label: 'oo as in moon', words: ['moon','food','room','school','tooth','spoon','boot','zoo','cool','pool','soon','noon','roof','smooth','broom','goose','loop','hoop','stool','cartoon'] },
    { id: 'oo-book', sound: '/ʊ/', grapheme: 'oo', label: 'oo as in book', words: ['book','look','cook','foot','good','wood','hook','took','shook','stood','wool','brook','crook','hood','cookie','wooden','football','cookbook','lookout','bookshelf'] },
    { id: 'ph', sound: '/f/', grapheme: 'ph', label: 'f sound with ph', words: ['phone','photo','graph','dolphin','elephant','alphabet','pharmacy','phrase','trophy','nephew','orphan','phonics','microphone','telephone','photograph','paragraph','sphere','phantom','physical','geography'] },
    { id: 'ture', sound: '/tʃɚ/', grapheme: 'ture', label: 'ture', words: ['future','picture','nature','feature','culture','adventure','furniture','capture','mixture','lecture','creature','departure','signature','temperature','literature','structure','agriculture','architecture','sculpture','venture'] },
  ];

  const wordKey = (value) => String(value || '').trim().toLocaleLowerCase();

  function indexesFor(word, grapheme, requestedStart = 0) {
    const pieces = grapheme.toLocaleLowerCase().split('_');
    if (pieces.length === 1) {
      const start = wordKey(word).indexOf(pieces[0], requestedStart);
      return start < 0 ? [] : Array.from({ length: Array.from(pieces[0]).length }, (_, offset) => start + offset);
    }
    const indexes = [];
    let cursor = requestedStart;
    pieces.forEach((piece, pieceIndex) => {
      const start = wordKey(word).indexOf(piece, cursor);
      if (pieceIndex === 0 && start !== requestedStart) return;
      if (start < 0) return;
      for (let offset = 0; offset < Array.from(piece).length; offset += 1) indexes.push(start + offset);
      cursor = start + Array.from(piece).length;
    });
    return indexes.length === pieces.join('').length ? indexes : [];
  }

  const wordSets = new Map(patterns.map((pattern) => [pattern.id, new Set(pattern.words.map(wordKey))]));

  function mappingsForWord(word) {
    const key = wordKey(word);
    const candidates = [];
    const lookup = window.SpellingSoundLookup;
    const encoded = lookup?.words?.[key];
    if (Array.isArray(encoded) && Array.isArray(lookup.patternIds)) {
      for (let offset = 0; offset + 1 < encoded.length; offset += 2) {
        const patternId = lookup.patternIds[encoded[offset]];
        const pattern = patterns.find((item) => item.id === patternId);
        const start = Number(encoded[offset + 1]);
        if (!pattern || !Number.isInteger(start) || start < 0) continue;
        candidates.push({
          order: patterns.indexOf(pattern),
          patternId: pattern.id,
          sound: pattern.sound,
          letters: pattern.grapheme,
          indexes: indexesFor(key, pattern.grapheme, start),
        });
      }
    }
    patterns.filter((pattern) => wordSets.get(pattern.id).has(key)).forEach((pattern, order) => candidates.push({
      order,
      patternId: pattern.id,
      sound: pattern.sound,
      letters: pattern.grapheme,
      indexes: indexesFor(key, pattern.grapheme),
    }));
    const seen = new Set();
    const valid = candidates.filter((mapping) => mapping.indexes.length > 0)
      .filter((mapping) => {
        const signature = `${mapping.patternId}:${mapping.indexes.join(',')}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      })
      .sort((left, right) => right.indexes.length - left.indexes.length || left.order - right.order);
    const claimed = new Set();
    return valid.filter((mapping) => {
      if (mapping.indexes.some((index) => claimed.has(index))) return false;
      mapping.indexes.forEach((index) => claimed.add(index));
      return true;
    }).sort((left, right) => left.order - right.order)
      .map(({ order, ...mapping }) => mapping);
  }

  const invalid = patterns.filter((pattern) => pattern.words.length < 20
    || new Set(pattern.words.map(wordKey)).size < 20
    || pattern.words.some((word) => indexesFor(word, pattern.grapheme).length === 0));
  if (invalid.length) console.error('[Spelling B] Invalid sound-spelling bank patterns', invalid);

  window.SpellingSoundBank = Object.freeze({ patterns, mappingsForWord });
})();
