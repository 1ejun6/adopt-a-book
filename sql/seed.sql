-- Demo data for a fresh database after base.sql. Run /seed after /base.
-- Recreate the two application accounts from their existing Supabase Auth users.
alter table public.users disable trigger protect_last_admin;
delete from public.users;
alter table public.users enable trigger protect_last_admin;
update public.books set status = 'available', updatedat = now()
where ownerid is null and status = 'reserved';

insert into public.users (id, name, email, role)
select
  authuser.id,
  coalesce(nullif(btrim(authuser.raw_user_meta_data ->> 'name'), ''), split_part(authuser.email, '@', 1)),
  authuser.email,
  case authuser.id
    when 'a3c11c76-41a4-4786-9803-a384c1d207a7'::uuid then 'admin'
    when 'b3563099-7900-40ba-a478-e8bb63b2d477'::uuid then 'customer'
  end
from auth.users authuser
where authuser.id in (
  'a3c11c76-41a4-4786-9803-a384c1d207a7'::uuid,
  'b3563099-7900-40ba-a478-e8bb63b2d477'::uuid
);

select public.sync_mrt_stations($stations$[
{"name":"Admiralty MRT","codes":["NS10"],"lat":1.44058856161847,"lng":103.800990519771},
{"name":"Aljunied MRT","codes":["EW9"],"lat":1.31643261181572,"lng":103.882906044384},
{"name":"Ang Mo Kio MRT","codes":["CR11","NS16"],"lat":1.36993284962264,"lng":103.849558092319},
{"name":"Bartley MRT","codes":["CC12"],"lat":1.34250117805245,"lng":103.880177899184},
{"name":"Bayshore MRT","codes":["TE29"],"lat":1.31312248291264,"lng":103.942309776767},
{"name":"Beauty World MRT","codes":["DT5"],"lat":1.34122317558551,"lng":103.775794285083},
{"name":"Bedok MRT","codes":["EW5"],"lat":1.3239799686816,"lng":103.929984495065},
{"name":"Bedok North MRT","codes":["DT29"],"lat":1.33474211664092,"lng":103.91797832995},
{"name":"Bedok Reservoir MRT","codes":["DT30"],"lat":1.33660782955101,"lng":103.932234623286},
{"name":"Bedok South MRT","codes":["TE30"],"lat":1.31668400658419,"lng":103.94931120983},
{"name":"Bencoolen MRT","codes":["DT21"],"lat":1.29891843369423,"lng":103.850353762716},
{"name":"Bendemeer MRT","codes":["DT23"],"lat":1.3136725284769,"lng":103.862977620945},
{"name":"Bishan MRT","codes":["CC15","NS17"],"lat":1.35083898784737,"lng":103.848143964542},
{"name":"Boon Keng MRT","codes":["NE9"],"lat":1.31933570922514,"lng":103.861569454156},
{"name":"Boon Lay MRT","codes":["EW27","JS8"],"lat":1.33860405469845,"lng":103.706064622772},
{"name":"Botanic Gardens MRT","codes":["CC19","DT9"],"lat":1.32211373558877,"lng":103.814984510627},
{"name":"Braddell MRT","codes":["NS18"],"lat":1.3404690010277,"lng":103.846799083148},
{"name":"Bras Basah MRT","codes":["CC2"],"lat":1.29686168649657,"lng":103.850667371637},
{"name":"Bright Hill MRT","codes":["TE7"],"lat":1.36328318545186,"lng":103.832893619991},
{"name":"Buangkok MRT","codes":["NE15"],"lat":1.38287001971673,"lng":103.893122569706},
{"name":"Bugis MRT","codes":["DT14","EW12"],"lat":1.29931350344582,"lng":103.857125959022},
{"name":"Bukit Batok MRT","codes":["NS2"],"lat":1.34903331201637,"lng":103.749566478309},
{"name":"Bukit Brown MRT","codes":["CC18"],"lat":1.33372888295974,"lng":103.830689549849},
{"name":"Bukit Gombak MRT","codes":["NS3"],"lat":1.35861159094193,"lng":103.751790910733},
{"name":"Bukit Panjang MRT","codes":["DT1"],"lat":1.37900211641037,"lng":103.761535114928},
{"name":"Buona Vista MRT","codes":["CC22","EW21"],"lat":1.30663450405001,"lng":103.790709404436},
{"name":"Caldecott MRT","codes":["CC17","TE9"],"lat":1.33724561271722,"lng":103.840161782075},
{"name":"Canberra MRT","codes":["NS12"],"lat":1.44307664075698,"lng":103.829702590959},
{"name":"Cantonment MRT","codes":["CC31"],"lat":1.27287214563204,"lng":103.837062313764},
{"name":"Cashew MRT","codes":["DT2"],"lat":1.36981544925553,"lng":103.764439214139},
{"name":"Changi Airport MRT","codes":["CG2"],"lat":1.35747897447693,"lng":103.98788356959},
{"name":"Chinatown MRT","codes":["DT19","NE4"],"lat":1.28422391919085,"lng":103.845143798953},
{"name":"Chinese Garden MRT","codes":["EW25"],"lat":1.34235282081401,"lng":103.732596738363},
{"name":"Choa Chu Kang MRT","codes":["JS1","NS4"],"lat":1.38536846992147,"lng":103.744084909492},
{"name":"City Hall MRT","codes":["EW13","NS25"],"lat":1.29293672227781,"lng":103.852585580366},
{"name":"Clarke Quay MRT","codes":["NE5"],"lat":1.28838602407588,"lng":103.846555209694},
{"name":"Clementi MRT","codes":["EW23"],"lat":1.31511625277378,"lng":103.765191452887},
{"name":"Commonwealth MRT","codes":["EW20"],"lat":1.30250199924325,"lng":103.798228523336},
{"name":"Dakota MRT","codes":["CC8"],"lat":1.30854798388122,"lng":103.889064718377},
{"name":"Defu MRT","codes":["CR07"],"lat":1.36255614834102,"lng":103.898195425087},
{"name":"Dhoby Ghaut MRT","codes":["CC1","NE6","NS24"],"lat":1.29891164362676,"lng":103.84629250696},
{"name":"Dover MRT","codes":["EW22"],"lat":1.31140529320964,"lng":103.778637841909},
{"name":"Downtown MRT","codes":["DT17"],"lat":1.27944638178917,"lng":103.852840829581},
{"name":"Esplanade MRT","codes":["CC3"],"lat":1.29365772453861,"lng":103.855081226245},
{"name":"Eunos MRT","codes":["EW7"],"lat":1.31978354916088,"lng":103.903225807255},
{"name":"Expo MRT","codes":["CG1","DT35"],"lat":1.33454977824818,"lng":103.961548211018},
{"name":"Farrer Park MRT","codes":["NE8"],"lat":1.31190557325775,"lng":103.853477716509},
{"name":"Farrer Road MRT","codes":["CC20"],"lat":1.31743915158966,"lng":103.807379214161},
{"name":"Fort Canning MRT","codes":["DT20"],"lat":1.29248194822997,"lng":103.844331362464},
{"name":"Gardens By The Bay MRT","codes":["TE22"],"lat":1.27848725876303,"lng":103.867454664421},
{"name":"Geylang Bahru MRT","codes":["DT24"],"lat":1.32130110228322,"lng":103.871622627141},
{"name":"Great World MRT","codes":["TE15"],"lat":1.29394816169383,"lng":103.833720837731},
{"name":"Gul Circle MRT","codes":["EW30"],"lat":1.31947090075209,"lng":103.660530461345},
{"name":"Harbourfront MRT","codes":["CC29","NE1"],"lat":1.26538938374902,"lng":103.821530157094},
{"name":"Havelock MRT","codes":["TE16"],"lat":1.28850523975312,"lng":103.833585838226},
{"name":"Haw Par Villa MRT","codes":["CC25"],"lat":1.28257135772489,"lng":103.781752725064},
{"name":"Hillview MRT","codes":["DT3"],"lat":1.36234486803558,"lng":103.767418254007},
{"name":"Holland Village MRT","codes":["CC21"],"lat":1.31224029631597,"lng":103.796399122407},
{"name":"Hougang MRT","codes":["NE14"],"lat":1.37129226620798,"lng":103.892380513029},
{"name":"Hume MRT","codes":["DT4"],"lat":1.3545953239503,"lng":103.769118851887},
{"name":"Jalan Besar MRT","codes":["DT22"],"lat":1.3051713878069,"lng":103.855295713435},
{"name":"Joo Koon MRT","codes":["EW29"],"lat":1.32771704084471,"lng":103.678374996164},
{"name":"Jurong East MRT","codes":["EW24","JE5","NS1"],"lat":1.33302751543941,"lng":103.742370487607},
{"name":"Kaki Bukit MRT","codes":["DT28"],"lat":1.33496735995429,"lng":103.908459338046},
{"name":"Kallang MRT","codes":["EW10"],"lat":1.3114889099882,"lng":103.871386541753},
{"name":"Katong Park MRT","codes":["TE24"],"lat":1.29783147778952,"lng":103.886178949924},
{"name":"Kembangan MRT","codes":["EW6"],"lat":1.3210381335934,"lng":103.912947930851},
{"name":"Kent Ridge MRT","codes":["CC24"],"lat":1.29353349887124,"lng":103.784572738173},
{"name":"Keppel MRT","codes":["CC30"],"lat":1.26977220124441,"lng":103.830031459523},
{"name":"Khatib MRT","codes":["NS14"],"lat":1.41738337009567,"lng":103.832979908243},
{"name":"King Albert Park MRT","codes":["DT6"],"lat":1.33566161262214,"lng":103.78339911344},
{"name":"Kovan MRT","codes":["NE13"],"lat":1.36017917065237,"lng":103.885064856353},
{"name":"Kranji MRT","codes":["NS7"],"lat":1.42508698073648,"lng":103.762137459497},
{"name":"Labrador Park MRT","codes":["CC27"],"lat":1.27225417749656,"lng":103.802631578765},
{"name":"Lakeside MRT","codes":["EW26"],"lat":1.34425911493819,"lng":103.720949087456},
{"name":"Lavender MRT","codes":["EW11"],"lat":1.30737781747064,"lng":103.862767633888},
{"name":"Lentor MRT","codes":["TE5"],"lat":1.3855065797217,"lng":103.835743809669},
{"name":"Little India MRT","codes":["DT12","NE7"],"lat":1.30701826765225,"lng":103.848660935092},
{"name":"Lorong Chuan MRT","codes":["CC14"],"lat":1.35161217074556,"lng":103.86415193865},
{"name":"Macpherson MRT","codes":["CC10","DT26"],"lat":1.32607760171667,"lng":103.890391305725},
{"name":"Marina Bay MRT","codes":["NS27","TE20"],"lat":1.27641029875499,"lng":103.854595522263},
{"name":"Marina South Pier MRT","codes":["NS28"],"lat":1.27102703612007,"lng":103.862447515736},
{"name":"Marine Parade MRT","codes":["TE26"],"lat":1.30261163483384,"lng":103.904983086812},
{"name":"Marine Terrace MRT","codes":["TE27"],"lat":1.30666510344814,"lng":103.9151067005},
{"name":"Marsiling MRT","codes":["NS8"],"lat":1.43252114855027,"lng":103.774074641403},
{"name":"Marymount MRT","codes":["CC16"],"lat":1.34870726345101,"lng":103.839423132332},
{"name":"Mattar MRT","codes":["DT25"],"lat":1.32687671501336,"lng":103.883247509542},
{"name":"Maxwell MRT","codes":["TE18"],"lat":1.28053329842877,"lng":103.843883670633},
{"name":"Mayflower MRT","codes":["TE6"],"lat":1.37146318831014,"lng":103.836567766944},
{"name":"Mount Pleasant MRT","codes":["TE10"],"lat":1.32856455460667,"lng":103.835188581989},
{"name":"Mountbatten MRT","codes":["CC7"],"lat":1.30620190525332,"lng":103.882528081051},
{"name":"Mrt Station (Je1) MRT","codes":["JE1"],"lat":1.3573289114388,"lng":103.733467748962},
{"name":"Mrt Station (Je2) MRT","codes":["JE2"],"lat":1.35244451963606,"lng":103.73674783311},
{"name":"Mrt Station (Je3) MRT","codes":["JE3"],"lat":1.34562983270652,"lng":103.739572988409},
{"name":"Mrt Station (Js2) MRT","codes":["JS2"],"lat":1.37922755842935,"lng":103.740022320403},
{"name":"Mrt Station (Js3) MRT","codes":["JS3"],"lat":1.36634689098718,"lng":103.730063135994},
{"name":"Mrt Station (Js4) MRT","codes":["JS4"],"lat":1.35812200829127,"lng":103.726153007987},
{"name":"Mrt Station (Js5) MRT","codes":["JS5"],"lat":1.35306468148146,"lng":103.713943249051},
{"name":"Mrt Station (Js6) MRT","codes":["JS6"],"lat":1.34918500140335,"lng":103.708285820033},
{"name":"Mrt Station (Js7) MRT","codes":["JS7"],"lat":1.34618225434116,"lng":103.703002254271},
{"name":"Mrt Station (Jw1) MRT","codes":["JW1"],"lat":1.3483403539896,"lng":103.698067375909},
{"name":"Mrt Station (Jw3) MRT","codes":["JW3"],"lat":1.35371753053643,"lng":103.686582183951},
{"name":"Mrt Station (Jw4) MRT","codes":["JW4"],"lat":1.34851407617417,"lng":103.68099807499},
{"name":"Mrt Station (Jw5) MRT","codes":["JW5"],"lat":1.3432054923337,"lng":103.678564298892},
{"name":"Napier MRT","codes":["TE12"],"lat":1.30678223364787,"lng":103.818956796815},
{"name":"Newton MRT","codes":["DT11","NS21"],"lat":1.3139928626457,"lng":103.83771461309},
{"name":"Nicoll Highway MRT","codes":["CC5"],"lat":1.29976684675138,"lng":103.863636965719},
{"name":"Novena MRT","codes":["NS20"],"lat":1.32044079120156,"lng":103.843825618748},
{"name":"One-North MRT","codes":["CC23"],"lat":1.29975987493556,"lng":103.78745750525},
{"name":"Orchard Boulevard MRT","codes":["TE13"],"lat":1.30242224836723,"lng":103.823868523249},
{"name":"Orchard MRT","codes":["NS22","TE14"],"lat":1.30398013681715,"lng":103.832245244375},
{"name":"Outram Park MRT","codes":["EW16","NE3","TE17"],"lat":1.28140504772212,"lng":103.839130979248},
{"name":"Pasir Panjang MRT","codes":["CC26"],"lat":1.27621352233767,"lng":103.791350313288},
{"name":"Pasir Ris East MRT","codes":["CR4"],"lat":1.36712928287615,"lng":103.960557318417},
{"name":"Pasir Ris MRT","codes":["EW1"],"lat":1.37304331635806,"lng":103.949284527763},
{"name":"Paya Lebar MRT","codes":["CC9","EW8"],"lat":1.31724738540349,"lng":103.892260753884},
{"name":"Pioneer MRT","codes":["EW28"],"lat":1.3375870110671,"lng":103.697321608473},
{"name":"Potong Pasir MRT","codes":["NE10"],"lat":1.33137949021367,"lng":103.869055656781},
{"name":"Prince Edward Road MRT","codes":["CC32"],"lat":1.27315693636087,"lng":103.847097123745},
{"name":"Promenade MRT","codes":["CC4","DT15"],"lat":1.29399798636233,"lng":103.860350000188},
{"name":"Punggol Coast MRT","codes":["NE18"],"lat":1.41492733388606,"lng":103.910166388177},
{"name":"Punggol MRT","codes":["NE17"],"lat":1.40454653668994,"lng":103.902072622228},
{"name":"Queenstown MRT","codes":["EW19"],"lat":1.29455085184931,"lng":103.806077155982},
{"name":"Raffles Place MRT","codes":["EW14","NS26"],"lat":1.28412561043659,"lng":103.851461712342},
{"name":"Redhill MRT","codes":["EW18"],"lat":1.28963453412888,"lng":103.81674097205},
{"name":"Rochor MRT","codes":["DT13"],"lat":1.30385218527656,"lng":103.852769428884},
{"name":"Sembawang MRT","codes":["NS11"],"lat":1.44905082158502,"lng":103.82004614021},
{"name":"Sengkang MRT","codes":["NE16"],"lat":1.39169462601521,"lng":103.895484694279},
{"name":"Serangoon MRT","codes":["CC13","NE12"],"lat":1.35063361526526,"lng":103.872771660431},
{"name":"Shenton Way MRT","codes":["TE19"],"lat":1.2777168283425,"lng":103.850367596067},
{"name":"Siglap MRT","codes":["TE28"],"lat":1.31000869432289,"lng":103.930025826707},
{"name":"Simei MRT","codes":["EW3"],"lat":1.34319707851829,"lng":103.953377214378},
{"name":"Sixth Avenue MRT","codes":["DT7"],"lat":1.33085764536227,"lng":103.796906838287},
{"name":"Somerset MRT","codes":["NS23"],"lat":1.30026416739005,"lng":103.839085753123},
{"name":"Springleaf MRT","codes":["TE4"],"lat":1.39758106126824,"lng":103.817856949946},
{"name":"Stadium MRT","codes":["CC6"],"lat":1.30281246847071,"lng":103.875337711088},
{"name":"Stevens MRT","codes":["DT10","TE11"],"lat":1.32006555750625,"lng":103.826024401924},
{"name":"Sungei Bedok MRT","codes":["DT37","TE31"],"lat":1.32040148729113,"lng":103.957183823478},
{"name":"Tai Seng MRT","codes":["CC11"],"lat":1.33514150139203,"lng":103.888389300191},
{"name":"Tampines East MRT","codes":["DT33"],"lat":1.35619148271545,"lng":103.9546344625},
{"name":"Tampines MRT","codes":["DT32","EW2"],"lat":1.35515041120473,"lng":103.94300988313},
{"name":"Tampines West MRT","codes":["DT31"],"lat":1.3455153056012,"lng":103.938436971221},
{"name":"Tan Kah Kee MRT","codes":["DT8"],"lat":1.32555623519898,"lng":103.807760304729},
{"name":"Tanah Merah MRT","codes":["EW4"],"lat":1.32718729074674,"lng":103.946348600798},
{"name":"Tanjong Katong MRT","codes":["TE25"],"lat":1.29931925769899,"lng":103.897368742078},
{"name":"Tanjong Pagar MRT","codes":["EW15"],"lat":1.27656131737247,"lng":103.845725186759},
{"name":"Tanjong Rhu MRT","codes":["TE23"],"lat":1.29726507940647,"lng":103.873453254621},
{"name":"Teck Ghee MRT","codes":["CR12"],"lat":1.36553610273552,"lng":103.843602271537},
{"name":"Telok Ayer MRT","codes":["DT18"],"lat":1.28206894769396,"lng":103.848648781083},
{"name":"Telok Blangah MRT","codes":["CC28"],"lat":1.27070647717762,"lng":103.809761611219},
{"name":"Tiong Bahru MRT","codes":["EW17"],"lat":1.28610253615776,"lng":103.827445112419},
{"name":"Toa Payoh MRT","codes":["NS19"],"lat":1.33262928096889,"lng":103.847502198047},
{"name":"Tuas Crescent MRT","codes":["EW31"],"lat":1.32102695598684,"lng":103.649078235626},
{"name":"Tuas Link MRT","codes":["EW33"],"lat":1.34088242451106,"lng":103.636991425127},
{"name":"Tuas West Road MRT","codes":["EW32"],"lat":1.32998504653102,"lng":103.639616648771},
{"name":"Ubi MRT","codes":["DT27"],"lat":1.32997425973973,"lng":103.899226655439},
{"name":"Upper Changi MRT","codes":["DT34"],"lat":1.34173977444994,"lng":103.961472788633},
{"name":"Upper Thomson MRT","codes":["TE8"],"lat":1.35441643365403,"lng":103.832898468504},
{"name":"Woodlands MRT","codes":["NS9","TE2"],"lat":1.4368196296152,"lng":103.786066799252},
{"name":"Woodlands North MRT","codes":["TE1"],"lat":1.44829245259622,"lng":103.785692682441},
{"name":"Woodlands South MRT","codes":["TE3"],"lat":1.42739605281443,"lng":103.793264322209},
{"name":"Woodleigh MRT","codes":["NE11"],"lat":1.3391900451939,"lng":103.87081830915},
{"name":"Xilin MRT","codes":["DT36"],"lat":1.32890694938858,"lng":103.964902569595},
{"name":"Yew Tee MRT","codes":["NS5"],"lat":1.39753506936299,"lng":103.747405150235},
{"name":"Yio Chu Kang MRT","codes":["NS15"],"lat":1.38175587099131,"lng":103.84494727118},
{"name":"Yishun MRT","codes":["NS13"],"lat":1.42944308477332,"lng":103.835005047246}
]$stations$::jsonb);

insert into public.adoptiondrives (id,title,location,eventdate,description,maxcapacity,status,mrtstationid)
select d.id,d.title,d.location,(now() at time zone 'Asia/Singapore')::date + d.daysfromnow,
       d.description,d.maxcapacity,d.status,s.id
from jsonb_to_recordset($drives$[
{"id":"0362bead-243b-4449-a430-59ae38752e34","title":"Community Book Swap","location":"Dhoby Ghaut MRT","daysfromnow":14,"description":"Bring a book and find your next read.","maxcapacity":40,"status":"open","mrtcode":"NS24"},
{"id":"55d453df-48fc-405a-8ee4-397466b15e6f","title":"Weekend Book Adoption","location":"Bugis MRT","daysfromnow":28,"description":"Discover books shared by the community.","maxcapacity":40,"status":"open","mrtcode":"EW12"},
{"id":"ede2b15f-a4e2-418e-8833-b3dd4abcac53","title":"Neighbourhood Reading Day","location":"City Hall MRT","daysfromnow":42,"description":"Meet readers and browse books for adoption.","maxcapacity":40,"status":"open","mrtcode":"NS25"},
{"id":"a4fb0a2c-5b13-4915-a812-97663c533f8f","title":"Books for Everyone","location":"Tampines MRT","daysfromnow":56,"description":"Share stories and take home a new read.","maxcapacity":40,"status":"open","mrtcode":"EW2"},
{"id":"5096d7c2-3cc3-4935-b0af-6e9bc6cabc70","title":"Library Friends Meetup","location":"Bishan MRT","daysfromnow":70,"description":"Browse community books and meet fellow readers.","maxcapacity":40,"status":"open","mrtcode":"NS17"}
]$drives$::jsonb)
  as d(id uuid,title text,location text,daysfromnow integer,description text,maxcapacity integer,status text,mrtcode text)
join public.mrtstations s on d.mrtcode = any(s.codes)
on conflict (id) do nothing;

with incoming as (
  select * from jsonb_to_recordset($books$[
{"id":"1100a411-b9fa-4574-82fc-dffa90f707d5","title":"Born a Crime","authors":["Trevor Noah"],"isbn":"3896675907","subjects":["apartheid","PERFORMING ARTS","HUMOR","Television personalities","Personal Memoirs","PERFORMING ARTS / Comedy","BIOGRAPHY & AUTOBIOGRAPHY","HUMOR / Form / Essays","Essays","Comedy","HUMOR / Essays","Comedians","Biography","Comedians, biography","South africa, biography","Mothers and sons","South africa, history","South africa, social conditions","nyt:combined-print-and-e-book-nonfiction=2016-12-04","New York Times bestseller"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8294078-L.jpg","openlibraryid":"/works/OL17824318W","mrtcode":"EW27"},
{"id":"1f7fa5eb-655b-4327-8218-097e91f3f0c6","title":"Devil and the Deep Sea","authors":["Sara Craven"],"isbn":"9780373111435","subjects":["Fiction, Romance, Contemporary","Fiction, romance, general"],"publicationyear":1988,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9620545-L.jpg","openlibraryid":"/works/OL11327658W","mrtcode":"DT14"},
{"id":"558c3761-0db3-4703-8a30-36a0351ffa75","title":"Educated","authors":["Tara Westover","Orah Danḳner"],"isbn":"9722533797","subjects":["Subculture","Home schooling","Family","Anecdotes","Victims of family violence","Women college students","Christian biography","Rural conditions","Survivalism","Biography","Women","Ancedotes","Idaho","BIOGRAPHY & AUTOBIOGRAPHY / Personal Memoirs","BIOGRAPHY & AUTOBIOGRAPHY / Women","BIOGRAPHY & AUTOBIOGRAPHY / Religious","Women, united states, biography","Idaho, biography","Idaho, social conditions","Family violence"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8314077-L.jpg","openlibraryid":"/works/OL18139176W","mrtcode":"NS27"},
{"id":"45bf1677-cb9a-473c-8daa-7fc9b4405559","title":"Five on a Treasure Island","authors":["Enid Blyton"],"isbn":"9798511735979","subjects":["Children: Grades 4-6","Famous Five (Fictitious characters)","Juvenile fiction","Children's fiction","Adventure and adventurers, fiction","famous five","kid's book","adventure","Translations from English","Children's stories, German","Children's stories","Buried treasure","Adventure and adventurers","Mystery and detective stories","Shipwrecks","Fiction","Pirates, fiction","Detective and mystery stories"],"publicationyear":1942,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14570937-L.jpg","openlibraryid":"/works/OL1948704W","mrtcode":"DT8"},
{"id":"71fed354-7686-4328-8e35-f8416c3ad4cc","title":"Howl, and Other Poems","authors":["Allen Ginsberg"],"isbn":"0872860175","subjects":["Poetry (poetic works by one author)","American poetry","American Poets","Beat generation","Poetry"],"publicationyear":1956,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662901-L.jpg","openlibraryid":"/works/OL102483W","mrtcode":"NS11"},
{"id":"285ac84b-add9-4d5b-8489-f767f9b493b4","title":"I Don't Love You Anymore","authors":["Rithvik Singh"],"isbn":"0143469134","subjects":["Poetry","Love poetry"],"publicationyear":2024,"description":"","coverurl":"https://covers.openlibrary.org/b/id/15116470-L.jpg","openlibraryid":"/works/OL38382569W","mrtcode":"EW25"},
{"id":"36bf6312-fb46-41b7-89c7-77c8826f07b0","title":"Ikigai","authors":["Chiemi Souen","Flor Kaneshiro"],"isbn":"9781953021168","subjects":["Children's fiction","Biography"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13110612-L.jpg","openlibraryid":"/works/OL26864096W","mrtcode":"CC22"},
{"id":"2c8a5cb1-9f14-45fe-8d78-8a81e42b7686","title":"It Starts with Us","authors":["Colleen Hoover"],"isbn":"9781797145105","subjects":["Contemporary","Romance","Friendship","Fiction","Young Adult Fiction","collectionid:nyt2020s","American literature","contemporary romance","new adult","domestic violence","second chance romance","forbidden love","family","forgiveness","redemption","healing","self-discovery"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12749873-L.jpg","openlibraryid":"/works/OL27733867W","mrtcode":"CC30"},
{"id":"1b43a4a6-92b8-4971-8a58-a94d1ec0ef8f","title":"Married at first sight","authors":["Gu Lingfei"],"isbn":null,"subjects":["Romance","Fiction, romance, contemporary","Fiction, romance, billionaires"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14312142-L.jpg","openlibraryid":"/works/OL35223328W","mrtcode":"NE8"},
{"id":"4bc9977c-e467-4f53-8af1-adb98b6ca0c6","title":"Milk and Honey","authors":["Rupi Kaur"],"isbn":"9781449483135","subjects":["Canadian poetry","Survival","Poetry","Women","Poetry (poetic works by one author)","nyt:trade-fiction-paperback=2016-05-01","New York Times bestseller","collectionID:TexChallenge2021","BODY, MIND & SPIRIT","FICTION","Romance","Literature","Amerikanisches Englisch","Lyrik","Kvinnor","Survival skills","American poetry","collectionID:KellerChallenge","banned books","collectionID:AlpineChallenge"],"publicationyear":2014,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8743595-L.jpg","openlibraryid":"/works/OL17606111W","mrtcode":"DT31"},
{"id":"4234a88d-a0fa-4de7-8dab-a2b74d381702","title":"Neverseen","authors":["Shannon Messenger"],"isbn":"2266272675","subjects":["fantasy","middle grade","Friendship","Juvenile fiction","Psychic ability","Elves","Memory","Adventure stories","Fiction","Adventure and adventurers","Fantasy & Magic","Action & Adventure","General","Social Issues","Children's fiction","Fairies, fiction","Friendship, fiction","Adventure and adventurers, fiction","Fantasy fiction","Parapsychology, fiction"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7990188-L.jpg","openlibraryid":"/works/OL17714887W","mrtcode":"DT36"},
{"id":"51a0ce51-114e-4d12-8c6d-a03f8fe004e2","title":"November 9","authors":["Colleen Hoover"],"isbn":"9781785412691","subjects":["Long-distance relationships","Novelists","Fiction","Fiction, romance, contemporary","New York Times Bestseller","Fiction, romance, new adult"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9219001-L.jpg","openlibraryid":"/works/OL20018811W","mrtcode":"DT24"},
{"id":"61ece980-f4f3-4617-88c6-e76096f0b7a7","title":"Outcast","authors":["Erin Hunter"],"isbn":"9780061651281","subjects":["Cats","Fantasy","Fantasy Fiction","Feral Cats","Fiction","Juvenile Fiction","Children's fiction","Cats, fiction","Brothers and sisters, fiction","Adventure and adventurers, fiction","Brothers and sisters","Adventure and adventurers","Adventure fiction","Adventure stories","Siblings","series:warriors_the_power_of_three","Fantasy fiction"],"publicationyear":2008,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7027037-L.jpg","openlibraryid":"/works/OL5714309W","mrtcode":"CC12"},
{"id":"70a59db9-c2f2-46da-86ac-d24e982443b3","title":"Papillon","authors":["Henri Charrière"],"isbn":"0688022693","subjects":["Prisoners, biography","Escapes","Prisoners","Biography","Autobiographical fiction","Prison life in fiction","Personal narratives","Biography: general","Language readers","Biografía","Colonias penales francesas","French Penal colonies","Presos","Prisons et pénitenciers","Évasions","Biographies","Prisonniers","Modern fiction","Spanish language","French Guiana"],"publicationyear":1969,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8752-L.jpg","openlibraryid":"/works/OL262984W","mrtcode":"NE11"},
{"id":"40a804e0-445d-47b1-8e8c-367555223175","title":"Paradise Lost","authors":["John Milton"],"isbn":"9780582215191","subjects":["Bible","Biography","Criticism and interpretation","Devil","Early works to 1800","English Christian poetry","English Epic poetry","English poetry","Fall of man","Fall of man in literature","Fall of man.","First editions","German poetry","History and criticism","History of Biblical events","Illustrations","Latin poetry","Poetry","Portraits","Temptation"],"publicationyear":1667,"description":"","coverurl":"https://covers.openlibrary.org/b/id/5992814-L.jpg","openlibraryid":"/works/OL810991W","mrtcode":"TE16"},
{"id":"39b8464e-9c27-4873-8900-247b1cb7aa01","title":"Restore me","authors":["Tahereh Mafi"],"isbn":"9780062676375","subjects":["Science fiction","Romance fiction","Ability","Dictatorship","Resistance to Government","Soldiers","Fiction","Children's fiction","Soldiers, fiction","Love, fiction","Adventure and adventurers, fiction"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8797404-L.jpg","openlibraryid":"/works/OL19737574W","mrtcode":"CC7"},
{"id":"001c42ee-6158-487c-88fc-c0071e190cf1","title":"Revolting rhymes","authors":["Roald Dahl"],"isbn":"9780141501758","subjects":["Fairy tales","Adaptations","Humorous poetry","Children's poetry, English","Narrative poetry","English poetry","Adaptation","Stories in rhyme","Contes","Ouvrages pour la jeunesse","Cuentos de hadas","Adaptaciones","Poesía narrativa","Poesía humorística","Poesía inglesa","Contes populars","Adaptacions lliures","Contes rimats","Children's poetry","Poetry"],"publicationyear":1982,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9176010-L.jpg","openlibraryid":"/works/OL45878W","mrtcode":"NE18"},
{"id":"40024c2a-3cdc-4a90-8abe-38dd883b4b21","title":"Ringkasan sejarat filsafat","authors":["K. Bertens"],"isbn":"9794130834","subjects":["Philosophy","History"],"publicationyear":1975,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8333070-L.jpg","openlibraryid":"/works/OL18170596W","mrtcode":"DT21"},
{"id":"2b281140-c2e7-4ab6-8049-dc9a39bf0503","title":"Sistematika filsafat","authors":["Sidi Gazalba"],"isbn":null,"subjects":["Philosophy"],"publicationyear":1973,"description":"","coverurl":null,"openlibraryid":"/works/OL388472W","mrtcode":"CC25"},
{"id":"036f135c-954f-4972-8c48-65d768e8cdc8","title":"Tao te Ching","authors":["老子","Yang Peng","Jordi Fibla","James Legge"],"isbn":"1985717093","subjects":["Chinese Philosophy","Chinese language materials","Peace","Tao","Taoism","Ouvrages avant 1800","Taoïsme","Religion","Asian Philosophy","Philosophy","New Age","General","Religion / Eastern","Mind, body, spirit: disciplines & techniques","Body, Mind & Spirit","Religion - World Religions","Spiritualism - General","BG-JUVENILE PROP - BG-JUVY ACTIVITY","Body, Mind & Spirit / Spiritualism","Religion - Commentaries / Reference"],"publicationyear":1842,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662232-L.jpg","openlibraryid":"/works/OL45499W","mrtcode":"EW18"},
{"id":"04c6c7fd-8017-4bf3-838a-b44adc382f81","title":"Thank You for Leaving","authors":["Rithvik Singh"],"isbn":"9789367901229","subjects":["Poetry"],"publicationyear":2025,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14847895-L.jpg","openlibraryid":"/works/OL42577236W","mrtcode":"DT32"},
{"id":"0a0bd9d9-193e-457c-85c2-93a54611c96e","title":"The Diary of a Young Girl- Anne Frank","authors":["Anne Frank"],"isbn":"9789352782772","subjects":["Historical","Biography"],"publicationyear":2001,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13526331-L.jpg","openlibraryid":"/works/OL27294413W","mrtcode":"NS20"},
{"id":"05c75ac7-5cc3-4117-87d5-09a34f8c9546","title":"The Dragonet Prophecy","authors":["Tui T. Sutherland"],"isbn":"1536430048","subjects":["Dragons","Juvenile fiction","Prophecies","Fantasy","Fiction","Adventure and adventurers","Fantasy fiction","Friendship, fiction","Adventure and adventurers, fiction","Children's fiction","Mythical creatures","Action & Adventure","Kidnapping victims","Prophecy","Dragons, fiction","Adventure stories"],"publicationyear":2012,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13460810-L.jpg","openlibraryid":"/works/OL27696982W","mrtcode":"TE19"},
{"id":"64c45cb9-c7b4-4d22-8ea1-be3cece7ad91","title":"The great conversation","authors":["Norman Melchert"],"isbn":"0199999678","subjects":["Textbooks","Philosophy","Introductions","History","Filosofie","Philosophy, history","Philosophy, introductions"],"publicationyear":1991,"description":"","coverurl":"https://covers.openlibrary.org/b/id/1454089-L.jpg","openlibraryid":"/works/OL1810842W","mrtcode":"DT7"},
{"id":"3229baeb-fd23-4170-85ac-6d95a22c6ea8","title":"The Mysterious Benedict Society (The Mysterious Benedict Society #1)","authors":["Trenton Lee Stewart"],"isbn":"0316003956","subjects":["Adventure and adventurers","Juvenile fiction","Adventure and adventurers in fiction","Narcolepsy","Schools in fiction","Fiction","Science fiction","Schools","School stories","JUVENILE FICTION / Social Themes / Friendship","JUVENILE FICTION / Family","Adventure fiction","Adventure stories","JUVENILE FICTION / Action & Adventure","Reading Level-Grade 9","Reading Level-Grade 11","Reading Level-Grade 10","Reading Level-Grade 12","Children's fiction","Adventure and adventurers, fiction"],"publicationyear":2007,"description":"","coverurl":"https://covers.openlibrary.org/b/id/2378898-L.jpg","openlibraryid":"/works/OL5848457W","mrtcode":"NS7"},
{"id":"0991748d-8d89-4472-8f84-44016c04bcb1","title":"The Myth of Sisyphus and Other Essays","authors":["Albert Camus"],"isbn":"9780394437606","subjects":["French essays","Life","Suicide","Absurd (philosophy)","Existentialism","Philosophy","History and criticism","French literature","French philosophy","Essays","Mythology","Modern philosophy"],"publicationyear":1955,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12726570-L.jpg","openlibraryid":"/works/OL1230690W","mrtcode":"CC18"},
{"id":"365956a4-c70a-463a-87ec-0136fce798e0","title":"The Problems of Philosophy","authors":["Bertrand Russell"],"isbn":"9781691297337","subjects":["Philosophy","Introductions","Theory of Knowledge","Metaphysics","Nonfiction","Métaphysique","Philosophie","open_syllabus_project","Philosophy, modern, 20th century","Philosophy, introductions","Knowledge, theory of","Philosophy, british","Conocimiento, Teoría del","Metafísica","Political science","General","Psychology"],"publicationyear":1900,"description":"","coverurl":"https://covers.openlibrary.org/b/id/6947403-L.jpg","openlibraryid":"/works/OL1088577W","mrtcode":"EW13"},
{"id":"19a21ea9-eca3-40f7-86ef-0bf21a6125ae","title":"The Prophet","authors":["Kahlil Gibran"],"isbn":"1909621595","subjects":["Poetry","Classics","Literature & Fiction","Religion","American Prose poems","Mysticism","Spiritual life"],"publicationyear":1923,"description":"","coverurl":"https://covers.openlibrary.org/b/id/418324-L.jpg","openlibraryid":"/works/OL318900W","mrtcode":"EW22"},
{"id":"0ba1effe-09e1-4f2e-89f6-7578ebc88789","title":"The Sea of Monsters","authors":["Rick Riordan"],"isbn":"0606265007","subjects":["Serie:Percy_Jackson_and_the_Olympians","Fiction","Fantasy","Greek Mythology","Juvenile fiction","Camps","Friendship","Camps, fiction","Adventure and adventurers","Middle school students","Monsters","Gods and goddesses","nyt:series_books=2007-07-21","New York Times bestseller","Gods, fiction","Suspense","Adaptations","American fiction","Action & Adventure","Legends, Myths, Fables"],"publicationyear":2005,"description":"","coverurl":"https://covers.openlibrary.org/b/id/108909-L.jpg","openlibraryid":"/works/OL492646W","mrtcode":"TE22"},
{"id":"f36271d7-f961-4b47-8dfa-cda65ccafc94","title":"The Story of Philosophy","authors":["Will Durant","讀書新聞社"],"isbn":"0671816748","subjects":["Philosophers","Philosophy","History","Biography","Philosophie","Philosophes","Philosophy, dictionaries","Philosophy, history","Nonfiction","Classics"],"publicationyear":1926,"description":"","coverurl":"https://covers.openlibrary.org/b/id/405360-L.jpg","openlibraryid":"/works/OL1073898W","mrtcode":"TE18"},
{"id":"ff8adc69-e082-41b8-8d35-0b8eb1effc62","title":"the sun and her flowers","authors":["Rupi Kaur"],"isbn":"9788432234057","subjects":["Self-actualization (Psychology)","Poetry","American poetry","nyt:combined-print-and-e-book-fiction=2017-10-22","New York Times bestseller","New York Times reviewed","Poetry (poetic works by one author)","American poetry -- 21st century","Self-actualization (Psychology) -- Poetry","Women"],"publicationyear":2017,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8084615-L.jpg","openlibraryid":"/works/OL17800586W","mrtcode":"CC6"},
{"id":"1c51dbcf-4909-47be-85b3-76be87f00456","title":"The Wisdom of Insecurity","authors":["Alan Watts"],"isbn":"0369704681","subjects":["Peur","Religion","Philosophie","Fear","Security (Psychology)","Philosophy and religion","Philosophy","Mental health","Religion, philosophy","Samospoznavanje","Long Now Manual for Civilization"],"publicationyear":1951,"description":"","coverurl":"https://covers.openlibrary.org/b/id/254059-L.jpg","openlibraryid":"/works/OL266158W","mrtcode":"TE10"},
{"id":"0bbacace-ad72-4d0e-88ea-a216476b4c15","title":"Think","authors":["Simon Blackburn"],"isbn":"0192854259","subjects":["Filosofía","Philosophy","Philosophy, introductions","Introductions"],"publicationyear":1999,"description":"","coverurl":"https://covers.openlibrary.org/b/id/116928-L.jpg","openlibraryid":"/works/OL1807609W","mrtcode":"CC28"},
{"id":"62706c23-ca5b-4069-854a-1ef2e04e289a","title":"Twisted Lies","authors":["Ana Huang"],"isbn":"1728274893","subjects":["Romance","suspense","mystery","thriller","dark romance","forbidden love","enemies to lovers","bad boy","strong heroine","college","academia","family drama","secrets","lies","betrayal","revenge","American literature","Fiction, romance, general","Fiction, general","Serie:Twisted"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14425197-L.jpg","openlibraryid":"/works/OL27818823W","mrtcode":"CC17"},
{"id":"3c1f4457-f261-4c61-8d0d-399ecb179fb1","title":"Twisted Love","authors":["Ana Huang"],"isbn":"9780349447575","subjects":["Fiction, romance, multicultural & interracial","Fiction, romance, new adult","Fiction, romance, contemporary","nyt:combined-print-and-e-book-fiction=2023-07-02","New York Times bestseller","Romance","contemporary romance","new adult romance","brother's best friend","forbidden love","dark romance","grumpy-sunshine","angst","love triangle","self-discovery","redemption","Serie:Twisted"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12940491-L.jpg","openlibraryid":"/works/OL24390422W","mrtcode":"EW10"},
{"id":"6c9333fd-b40c-4368-8d0f-a0523b24a25a","title":"Um casamento arranjado","authors":["Zana Kheiron"],"isbn":null,"subjects":["romance","love"],"publicationyear":2019,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14321120-L.jpg","openlibraryid":"/works/OL35351151W","mrtcode":"TE25"},
{"id":"6a5d4e6c-b12c-49b9-8133-f542e58c475e","title":"When Breath Becomes Air","authors":["Paul Kalanithi"],"isbn":"8652122822","subjects":["philosophy","Neurosurgeons","Cancer","Lungs","Husband and wife","Patients","Personal Memoirs","Health","Biography","BIOGRAPHY & AUTOBIOGRAPHY","SOCIAL SCIENCES","Death & Dying","Biographies","MEDICAL","Lung Neoplasms","Lung cancer patients","SOCIAL SCIENCE","General","Husbands","Biografia"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/11463139-L.jpg","openlibraryid":"/works/OL17356252W","mrtcode":"DT27"},
{"id":"01c33cd0-c1f3-4afd-8c57-83dddff26882","title":"Where the Red Fern Grows","authors":["Wilson Rawls"],"isbn":"0613835344","subjects":["Social Issues - Friendship","Juvenile Fiction","Children's Books/Ages 9-12 Fiction","Children: Grades 4-6","Social Situations - Adolescence","Social Issues - Adolescence","Classics","Juvenile Fiction / Social Situations / Adolescence","Children's 9-12 - Literature - Classics / Contemporary","Action & Adventure - General","Animals - Dogs","Fiction","children's classics","dogs","hounds","mountains","young adult fiction","Open Library Staff Picks","Classic Literature","Hunting dogs"],"publicationyear":1961,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7996608-L.jpg","openlibraryid":"/works/OL465360W","mrtcode":"NE16"},
{"id":"724533b2-46ce-4177-8e03-b7eff2f70054","title":"Wings of Fire","authors":["A. P. J. Abdul Kalam"],"isbn":"8173711461","subjects":["Biography","Presidents","Scientists"],"publicationyear":1999,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9153819-L.jpg","openlibraryid":"/works/OL1037811W","mrtcode":"DT37"},
{"id":"4fb95c2a-2950-4e79-81bd-b5d4f0f9285b","title":"走ることについて語るときに僕の語ること","authors":["村上春樹"],"isbn":"3442739454","subjects":["Marathon running","Japanese Authors","Biography","Running","Biography & Autobiography","Health & Fitness","New Age","Nonfiction","Japanese essays","Authorship","Travel","Japan, biography","Authors, biography","nyt:hardcover-nonfiction=2008-08-17","New York Times bestseller","autobiography","japan","sports","memoir","Biographies as Topic"],"publicationyear":2006,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7167416-L.jpg","openlibraryid":"/works/OL2625422W","mrtcode":"NS23"}
]$books$::jsonb)
    as book(id uuid,title text,authors text[],isbn text,subjects text[],publicationyear integer,
      description text,coverurl text,openlibraryid text,mrtcode text)
), inserted as (
  insert into public.books
    (id,title,authors,isbn,subjects,publicationyear,description,coverurl,openlibraryid,source,status,mrtstationid)
  select b.id,b.title,b.authors,b.isbn,b.subjects,b.publicationyear,b.description,b.coverurl,b.openlibraryid,
         'open_library','available',s.id
  from incoming b join public.mrtstations s on b.mrtcode = any(s.codes)
  where not exists (select 1 from public.books existing where existing.openlibraryid = b.openlibraryid)
  on conflict (id) do nothing
  returning id
)
select (select count(*)::integer from inserted) as inserted,
       (select count(*)::integer from incoming) - (select count(*)::integer from inserted) as skipped;

-- Add repeatable demo activity for the seeded customer account.
do $$
declare
  demo_admin_id constant uuid := 'a3c11c76-41a4-4786-9803-a384c1d207a7';
  demo_customer_id constant uuid := 'b3563099-7900-40ba-a478-e8bb63b2d477';
  selected_book record;
  application_id uuid;
  appointment_number integer := 0;
begin
  for selected_book in
    select id, title, collectionarea
    from public.books
    where status = 'available' and ownerid is null
    order by id
    limit 3
  loop
    insert into public.adoptionapplications (userid, bookid)
    values (demo_customer_id, selected_book.id)
    returning id into application_id;

    perform public.decide_book_application(application_id, demo_admin_id, 'approved');

    appointment_number := appointment_number + 1;
    insert into public.appointments
      (userid, bookid, booktitle, location, appointmentdate, timeslot)
    values
      (demo_customer_id, selected_book.id, selected_book.title,
       selected_book.collectionarea, (now() at time zone 'Asia/Singapore')::date + appointment_number,
       case appointment_number
         when 1 then '10:00 - 11:00'
         when 2 then '11:00 - 12:00'
         else '14:00 - 15:00'
       end);
  end loop;

  insert into public.watchlist (userid, bookid, comments)
  select demo_customer_id, book.id, 'Seeded watchlist example'
  from public.books book
  where book.status = 'available'
    and book.ownerid is null
    and not exists (
      select 1 from public.watchlist saved
      where saved.userid = demo_customer_id and saved.bookid = book.id
    )
  order by book.id
  limit 3;
end;
$$;
