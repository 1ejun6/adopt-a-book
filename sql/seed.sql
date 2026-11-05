-- Complete demo reset. Apply base.sql (fresh DB) or the forward migration first.
-- This single DO statement is atomic even when executed directly in a SQL editor.
-- Only the fixture IDs below and their demo-customer activity are rebuilt.
-- Supabase Auth accounts and unrelated application records are preserved.
-- Coverage on an untouched demo DB: at least 5 distinct available titles in each
-- of the 26 shared genres, 42 journey copies (3 per scenario), 30 appointments,
-- 9 watchlist entries (3 each available/reserved/adopted), and 20 drives
-- (5 future open, 3 each today/full/manually closed/cancelled/past).
-- Protected fixtures are skipped, so existing customer activity may reduce counts.
do $seed$
declare
  admin_id constant uuid := 'a3c11c76-41a4-4786-9803-a384c1d207a7';
  customer_id constant uuid := 'b3563099-7900-40ba-a478-e8bb63b2d477';
  today date := (now() at time zone 'Asia/Singapore')::date;
  item record; application_id uuid; appointment_id uuid; pickup_date date;
  proposed jsonb; selected_status text;
begin
  -- Fail before touching data if the existing demo logins are missing or have the wrong role.
  if (select count(*) from auth.users where id in (admin_id,customer_id)) <> 2 then
    raise exception 'Seed requires the existing demo admin and customer Supabase Auth accounts. No data was changed.';
  end if;
  if exists(select 1 from public.users where (id=admin_id and role<>'admin') or (id=customer_id and role<>'customer')) then
    raise exception 'Demo account roles do not match. No data was changed.';
  end if;
  insert into public.users(id,name,email,role)
  select id,coalesce(nullif(btrim(raw_user_meta_data->>'name'),''),split_part(email,'@',1)),email,
    case when id=admin_id then 'admin' else 'customer' end
  from auth.users where id in (admin_id,customer_id)
  on conflict(id) do nothing;
  update public.users set preferredgenres=array['Fiction','Fantasy','Romance'] where id=customer_id;

  perform public.sync_mrt_stations($stations$[
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

  create temporary table demo_seed_books on commit drop as
  select * from jsonb_to_recordset($books$[
{"id":"1100a411-b9fa-4574-82fc-dffa90f707d5","title":"Born a Crime","authors":["Trevor Noah"],"isbn":"3896675907","subjects":["Biography"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8294078-L.jpg","openlibraryid":"/works/OL17824318W","mrtcode":"EW27","condition":"good"},
{"id":"1f7fa5eb-655b-4327-8218-097e91f3f0c6","title":"Devil and the Deep Sea","authors":["Sara Craven"],"isbn":"9780373111435","subjects":["Romance"],"publicationyear":1988,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9620545-L.jpg","openlibraryid":"/works/OL11327658W","mrtcode":"DT14","condition":"good"},
{"id":"558c3761-0db3-4703-8a30-36a0351ffa75","title":"Educated","authors":["Tara Westover","Orah Danḳner"],"isbn":"9722533797","subjects":["Biography"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8314077-L.jpg","openlibraryid":"/works/OL18139176W","mrtcode":"NS27","condition":"good"},
{"id":"45bf1677-cb9a-473c-8daa-7fc9b4405559","title":"Five on a Treasure Island","authors":["Enid Blyton"],"isbn":"9798511735979","subjects":["Adventure"],"publicationyear":1942,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14570937-L.jpg","openlibraryid":"/works/OL1948704W","mrtcode":"DT8","condition":"good"},
{"id":"71fed354-7686-4328-8e35-f8416c3ad4cc","title":"Howl, and Other Poems","authors":["Allen Ginsberg"],"isbn":"0872860175","subjects":["Poetry"],"publicationyear":1956,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662901-L.jpg","openlibraryid":"/works/OL102483W","mrtcode":"NS11","condition":"good"},
{"id":"285ac84b-add9-4d5b-8489-f767f9b493b4","title":"I Don't Love You Anymore","authors":["Rithvik Singh"],"isbn":"0143469134","subjects":["Poetry"],"publicationyear":2024,"description":"","coverurl":"https://covers.openlibrary.org/b/id/15116470-L.jpg","openlibraryid":"/works/OL38382569W","mrtcode":"EW25","condition":"good"},
{"id":"36bf6312-fb46-41b7-89c7-77c8826f07b0","title":"Ikigai","authors":["Chiemi Souen","Flor Kaneshiro"],"isbn":"9781953021168","subjects":["Biography"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13110612-L.jpg","openlibraryid":"/works/OL26864096W","mrtcode":"CC22","condition":"good"},
{"id":"2c8a5cb1-9f14-45fe-8d78-8a81e42b7686","title":"It Starts with Us","authors":["Colleen Hoover"],"isbn":"9781797145105","subjects":["Romance"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12749873-L.jpg","openlibraryid":"/works/OL27733867W","mrtcode":"CC30","condition":"good"},
{"id":"1b43a4a6-92b8-4971-8a58-a94d1ec0ef8f","title":"Married at first sight","authors":["Gu Lingfei"],"isbn":null,"subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14312142-L.jpg","openlibraryid":"/works/OL35223328W","mrtcode":"NE8","condition":"good"},
{"id":"4bc9977c-e467-4f53-8af1-adb98b6ca0c6","title":"Milk and Honey","authors":["Rupi Kaur"],"isbn":"9781449483135","subjects":["Poetry"],"publicationyear":2014,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8743595-L.jpg","openlibraryid":"/works/OL17606111W","mrtcode":"DT31","condition":"good"},
{"id":"4234a88d-a0fa-4de7-8dab-a2b74d381702","title":"Neverseen","authors":["Shannon Messenger"],"isbn":"2266272675","subjects":["Fantasy"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7990188-L.jpg","openlibraryid":"/works/OL17714887W","mrtcode":"DT36","condition":"good"},
{"id":"51a0ce51-114e-4d12-8c6d-a03f8fe004e2","title":"November 9","authors":["Colleen Hoover"],"isbn":"9781785412691","subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9219001-L.jpg","openlibraryid":"/works/OL20018811W","mrtcode":"DT24","condition":"good"},
{"id":"61ece980-f4f3-4617-88c6-e76096f0b7a7","title":"Outcast","authors":["Erin Hunter"],"isbn":"9780061651281","subjects":["Fantasy"],"publicationyear":2008,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7027037-L.jpg","openlibraryid":"/works/OL5714309W","mrtcode":"CC12","condition":"good"},
{"id":"70a59db9-c2f2-46da-86ac-d24e982443b3","title":"Papillon","authors":["Henri Charrière"],"isbn":"0688022693","subjects":["Biography"],"publicationyear":1969,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8752-L.jpg","openlibraryid":"/works/OL262984W","mrtcode":"NE11","condition":"good"},
{"id":"40a804e0-445d-47b1-8e8c-367555223175","title":"Paradise Lost","authors":["John Milton"],"isbn":"9780582215191","subjects":["Biography"],"publicationyear":1667,"description":"","coverurl":"https://covers.openlibrary.org/b/id/5992814-L.jpg","openlibraryid":"/works/OL810991W","mrtcode":"TE16","condition":"good"},
{"id":"39b8464e-9c27-4873-8900-247b1cb7aa01","title":"Restore me","authors":["Tahereh Mafi"],"isbn":"9780062676375","subjects":["Science fiction"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8797404-L.jpg","openlibraryid":"/works/OL19737574W","mrtcode":"CC7","condition":"good"},
{"id":"001c42ee-6158-487c-88fc-c0071e190cf1","title":"Revolting rhymes","authors":["Roald Dahl"],"isbn":"9780141501758","subjects":["Poetry"],"publicationyear":1982,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9176010-L.jpg","openlibraryid":"/works/OL45878W","mrtcode":"NE18","condition":"good"},
{"id":"40024c2a-3cdc-4a90-8abe-38dd883b4b21","title":"Ringkasan sejarat filsafat","authors":["K. Bertens"],"isbn":"9794130834","subjects":["Philosophy"],"publicationyear":1975,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8333070-L.jpg","openlibraryid":"/works/OL18170596W","mrtcode":"DT21","condition":"good"},
{"id":"2b281140-c2e7-4ab6-8049-dc9a39bf0503","title":"Sistematika filsafat","authors":["Sidi Gazalba"],"isbn":null,"subjects":["Philosophy"],"publicationyear":1973,"description":"","coverurl":null,"openlibraryid":"/works/OL388472W","mrtcode":"CC25","condition":"good"},
{"id":"036f135c-954f-4972-8c48-65d768e8cdc8","title":"Tao te Ching","authors":["老子","Yang Peng","Jordi Fibla","James Legge"],"isbn":"1985717093","subjects":["Religion"],"publicationyear":1842,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662232-L.jpg","openlibraryid":"/works/OL45499W","mrtcode":"EW18","condition":"good"},
{"id":"04c6c7fd-8017-4bf3-838a-b44adc382f81","title":"Thank You for Leaving","authors":["Rithvik Singh"],"isbn":"9789367901229","subjects":["Poetry"],"publicationyear":2025,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14847895-L.jpg","openlibraryid":"/works/OL42577236W","mrtcode":"DT32","condition":"good"},
{"id":"0a0bd9d9-193e-457c-85c2-93a54611c96e","title":"The Diary of a Young Girl- Anne Frank","authors":["Anne Frank"],"isbn":"9789352782772","subjects":["Biography"],"publicationyear":2001,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13526331-L.jpg","openlibraryid":"/works/OL27294413W","mrtcode":"NS20","condition":"good"},
{"id":"05c75ac7-5cc3-4117-87d5-09a34f8c9546","title":"The Dragonet Prophecy","authors":["Tui T. Sutherland"],"isbn":"1536430048","subjects":["Fantasy"],"publicationyear":2012,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13460810-L.jpg","openlibraryid":"/works/OL27696982W","mrtcode":"TE19","condition":"good"},
{"id":"64c45cb9-c7b4-4d22-8ea1-be3cece7ad91","title":"The great conversation","authors":["Norman Melchert"],"isbn":"0199999678","subjects":["Philosophy"],"publicationyear":1991,"description":"","coverurl":"https://covers.openlibrary.org/b/id/1454089-L.jpg","openlibraryid":"/works/OL1810842W","mrtcode":"DT7","condition":"good"},
{"id":"3229baeb-fd23-4170-85ac-6d95a22c6ea8","title":"The Mysterious Benedict Society (The Mysterious Benedict Society #1)","authors":["Trenton Lee Stewart"],"isbn":"0316003956","subjects":["Science fiction"],"publicationyear":2007,"description":"","coverurl":"https://covers.openlibrary.org/b/id/2378898-L.jpg","openlibraryid":"/works/OL5848457W","mrtcode":"NS7","condition":"good"},
{"id":"0991748d-8d89-4472-8f84-44016c04bcb1","title":"The Myth of Sisyphus and Other Essays","authors":["Albert Camus"],"isbn":"9780394437606","subjects":["Philosophy"],"publicationyear":1955,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12726570-L.jpg","openlibraryid":"/works/OL1230690W","mrtcode":"CC18","condition":"good"},
{"id":"365956a4-c70a-463a-87ec-0136fce798e0","title":"The Problems of Philosophy","authors":["Bertrand Russell"],"isbn":"9781691297337","subjects":["Philosophy"],"publicationyear":1900,"description":"","coverurl":"https://covers.openlibrary.org/b/id/6947403-L.jpg","openlibraryid":"/works/OL1088577W","mrtcode":"EW13","condition":"good"},
{"id":"19a21ea9-eca3-40f7-86ef-0bf21a6125ae","title":"The Prophet","authors":["Kahlil Gibran"],"isbn":"1909621595","subjects":["Poetry"],"publicationyear":1923,"description":"","coverurl":"https://covers.openlibrary.org/b/id/418324-L.jpg","openlibraryid":"/works/OL318900W","mrtcode":"EW22","condition":"good"},
{"id":"0ba1effe-09e1-4f2e-89f6-7578ebc88789","title":"The Sea of Monsters","authors":["Rick Riordan"],"isbn":"0606265007","subjects":["Fantasy"],"publicationyear":2005,"description":"","coverurl":"https://covers.openlibrary.org/b/id/108909-L.jpg","openlibraryid":"/works/OL492646W","mrtcode":"TE22","condition":"good"},
{"id":"f36271d7-f961-4b47-8dfa-cda65ccafc94","title":"The Story of Philosophy","authors":["Will Durant","讀書新聞社"],"isbn":"0671816748","subjects":["Philosophy"],"publicationyear":1926,"description":"","coverurl":"https://covers.openlibrary.org/b/id/405360-L.jpg","openlibraryid":"/works/OL1073898W","mrtcode":"TE18","condition":"good"},
{"id":"ff8adc69-e082-41b8-8d35-0b8eb1effc62","title":"the sun and her flowers","authors":["Rupi Kaur"],"isbn":"9788432234057","subjects":["Poetry"],"publicationyear":2017,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8084615-L.jpg","openlibraryid":"/works/OL17800586W","mrtcode":"CC6","condition":"good"},
{"id":"1c51dbcf-4909-47be-85b3-76be87f00456","title":"The Wisdom of Insecurity","authors":["Alan Watts"],"isbn":"0369704681","subjects":["Religion"],"publicationyear":1951,"description":"","coverurl":"https://covers.openlibrary.org/b/id/254059-L.jpg","openlibraryid":"/works/OL266158W","mrtcode":"TE10","condition":"good"},
{"id":"0bbacace-ad72-4d0e-88ea-a216476b4c15","title":"Think","authors":["Simon Blackburn"],"isbn":"0192854259","subjects":["Philosophy"],"publicationyear":1999,"description":"","coverurl":"https://covers.openlibrary.org/b/id/116928-L.jpg","openlibraryid":"/works/OL1807609W","mrtcode":"CC28","condition":"good"},
{"id":"62706c23-ca5b-4069-854a-1ef2e04e289a","title":"Twisted Lies","authors":["Ana Huang"],"isbn":"1728274893","subjects":["Romance"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14425197-L.jpg","openlibraryid":"/works/OL27818823W","mrtcode":"CC17","condition":"good"},
{"id":"3c1f4457-f261-4c61-8d0d-399ecb179fb1","title":"Twisted Love","authors":["Ana Huang"],"isbn":"9780349447575","subjects":["Romance"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12940491-L.jpg","openlibraryid":"/works/OL24390422W","mrtcode":"EW10","condition":"good"},
{"id":"6c9333fd-b40c-4368-8d0f-a0523b24a25a","title":"Um casamento arranjado","authors":["Zana Kheiron"],"isbn":null,"subjects":["Romance"],"publicationyear":2019,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14321120-L.jpg","openlibraryid":"/works/OL35351151W","mrtcode":"TE25","condition":"good"},
{"id":"6a5d4e6c-b12c-49b9-8133-f542e58c475e","title":"When Breath Becomes Air","authors":["Paul Kalanithi"],"isbn":"8652122822","subjects":["Philosophy"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/11463139-L.jpg","openlibraryid":"/works/OL17356252W","mrtcode":"DT27","condition":"good"},
{"id":"01c33cd0-c1f3-4afd-8c57-83dddff26882","title":"Where the Red Fern Grows","authors":["Wilson Rawls"],"isbn":"0613835344","subjects":["Young adult"],"publicationyear":1961,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7996608-L.jpg","openlibraryid":"/works/OL465360W","mrtcode":"NE16","condition":"good"},
{"id":"724533b2-46ce-4177-8e03-b7eff2f70054","title":"Wings of Fire","authors":["A. P. J. Abdul Kalam"],"isbn":"8173711461","subjects":["Biography"],"publicationyear":1999,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9153819-L.jpg","openlibraryid":"/works/OL1037811W","mrtcode":"DT37","condition":"good"},
{"id":"4fb95c2a-2950-4e79-81bd-b5d4f0f9285b","title":"走ることについて語るときに僕の語ること","authors":["村上春樹"],"isbn":"3442739454","subjects":["Biography"],"publicationyear":2006,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7167416-L.jpg","openlibraryid":"/works/OL2625422W","mrtcode":"NS23","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000001","title":"Treasure Island","authors":["Robert Louis Stevenson"],"subjects":["Adventure"],"description":"Adventure selection for community reading: Treasure Island.","mrtcode":"NS24","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000002","title":"Ways of Seeing","authors":["John Berger"],"subjects":["Art"],"description":"Art selection for community reading: Ways of Seeing.","mrtcode":"EW12","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000003","title":"The Autobiography of Benjamin Franklin","authors":["Benjamin Franklin"],"subjects":["Biography"],"description":"Biography selection for community reading: The Autobiography of Benjamin Franklin.","mrtcode":"NS25","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000004","title":"The Lean Startup","authors":["Eric Ries"],"subjects":["Business"],"description":"Business selection for community reading: The Lean Startup.","mrtcode":"EW2","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000005","title":"Charlotte's Web","authors":["E. B. White"],"subjects":["Children"],"description":"Children selection for community reading: Charlotte's Web.","mrtcode":"NS17","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000006","title":"Watchmen","authors":["Alan Moore","Dave Gibbons"],"subjects":["Comics"],"description":"Comics selection for community reading: Watchmen.","mrtcode":"NS24","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000007","title":"Salt, Fat, Acid, Heat","authors":["Samin Nosrat"],"subjects":["Cooking"],"description":"Cooking selection for community reading: Salt, Fat, Acid, Heat.","mrtcode":"EW12","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000008","title":"The Hobbit","authors":["J. R. R. Tolkien"],"subjects":["Fantasy"],"description":"Fantasy selection for community reading: The Hobbit.","mrtcode":"NS25","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000009","title":"Pride and Prejudice","authors":["Jane Austen"],"subjects":["Fiction"],"description":"Fiction selection for community reading: Pride and Prejudice.","mrtcode":"EW2","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000010","title":"Why We Sleep","authors":["Matthew Walker"],"subjects":["Health"],"description":"Health selection for community reading: Why We Sleep.","mrtcode":"NS17","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000011","title":"Wolf Hall","authors":["Hilary Mantel"],"subjects":["Historical fiction"],"description":"Historical fiction selection for community reading: Wolf Hall.","mrtcode":"NS24","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000012","title":"The Guns of August","authors":["Barbara W. Tuchman"],"subjects":["History"],"description":"History selection for community reading: The Guns of August.","mrtcode":"EW12","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000013","title":"Dracula","authors":["Bram Stoker"],"subjects":["Horror"],"description":"Horror selection for community reading: Dracula.","mrtcode":"NS25","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000014","title":"The Hound of the Baskervilles","authors":["Arthur Conan Doyle"],"subjects":["Mystery"],"description":"Mystery selection for community reading: The Hound of the Baskervilles.","mrtcode":"EW2","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000015","title":"A Room of One's Own","authors":["Virginia Woolf"],"subjects":["Nonfiction"],"description":"Nonfiction selection for community reading: A Room of One's Own.","mrtcode":"NS17","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000016","title":"Meditations","authors":["Marcus Aurelius"],"subjects":["Philosophy"],"description":"Philosophy selection for community reading: Meditations.","mrtcode":"NS24","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000017","title":"Leaves of Grass","authors":["Walt Whitman"],"subjects":["Poetry"],"description":"Poetry selection for community reading: Leaves of Grass.","mrtcode":"EW12","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000018","title":"The World's Religions","authors":["Huston Smith"],"subjects":["Religion"],"description":"Religion selection for community reading: The World's Religions.","mrtcode":"NS25","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000019","title":"Persuasion","authors":["Jane Austen"],"subjects":["Romance"],"description":"Romance selection for community reading: Persuasion.","mrtcode":"EW2","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000020","title":"A Brief History of Time","authors":["Stephen Hawking"],"subjects":["Science"],"description":"Science selection for community reading: A Brief History of Time.","mrtcode":"NS17","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000021","title":"Dune","authors":["Frank Herbert"],"subjects":["Science fiction"],"description":"Science fiction selection for community reading: Dune.","mrtcode":"NS24","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000022","title":"Atomic Habits","authors":["James Clear"],"subjects":["Self-help"],"description":"Self-help selection for community reading: Atomic Habits.","mrtcode":"EW12","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000023","title":"The Pragmatic Programmer","authors":["Andrew Hunt","David Thomas"],"subjects":["Technology"],"description":"Technology selection for community reading: The Pragmatic Programmer.","mrtcode":"NS25","condition":"good"},
{"id":"de000001-0000-4000-8000-000000000024","title":"The Day of the Jackal","authors":["Frederick Forsyth"],"subjects":["Thriller"],"description":"Thriller selection for community reading: The Day of the Jackal.","mrtcode":"EW2","condition":"fair"},
{"id":"de000001-0000-4000-8000-000000000025","title":"In Patagonia","authors":["Bruce Chatwin"],"subjects":["Travel"],"description":"Travel selection for community reading: In Patagonia.","mrtcode":"NS17","condition":"like new"},
{"id":"de000001-0000-4000-8000-000000000026","title":"The Hunger Games","authors":["Suzanne Collins"],"subjects":["Young adult"],"description":"Young adult selection for community reading: The Hunger Games.","mrtcode":"NS24","condition":"good"},
{"id":"de000002-0000-4000-8000-000000000001","title":"Born a Crime — journey demo copy","authors":["Trevor Noah"],"isbn":"3896675907","subjects":["Biography"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8294078-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":1,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000002","title":"Devil and the Deep Sea — journey demo copy","authors":["Sara Craven"],"isbn":"9780373111435","subjects":["Romance"],"publicationyear":1988,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9620545-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":2,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000003","title":"Educated — journey demo copy","authors":["Tara Westover","Orah Danḳner"],"isbn":"9722533797","subjects":["Biography"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8314077-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":3,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000004","title":"Five on a Treasure Island — journey demo copy","authors":["Enid Blyton"],"isbn":"9798511735979","subjects":["Adventure"],"publicationyear":1942,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14570937-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":4,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000005","title":"Howl, and Other Poems — journey demo copy","authors":["Allen Ginsberg"],"isbn":"0872860175","subjects":["Poetry"],"publicationyear":1956,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662901-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":5,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000006","title":"I Don't Love You Anymore — journey demo copy","authors":["Rithvik Singh"],"isbn":"0143469134","subjects":["Poetry"],"publicationyear":2024,"description":"","coverurl":"https://covers.openlibrary.org/b/id/15116470-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":6,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000007","title":"Ikigai — journey demo copy","authors":["Chiemi Souen","Flor Kaneshiro"],"isbn":"9781953021168","subjects":["Biography"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13110612-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":7,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000008","title":"It Starts with Us — journey demo copy","authors":["Colleen Hoover"],"isbn":"9781797145105","subjects":["Romance"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12749873-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":8,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000009","title":"Married at first sight — journey demo copy","authors":["Gu Lingfei"],"isbn":null,"subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14312142-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":9,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000010","title":"Milk and Honey — journey demo copy","authors":["Rupi Kaur"],"isbn":"9781449483135","subjects":["Poetry"],"publicationyear":2014,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8743595-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":10,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000011","title":"Neverseen — journey demo copy","authors":["Shannon Messenger"],"isbn":"2266272675","subjects":["Fantasy"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7990188-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":11,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000012","title":"November 9 — journey demo copy","authors":["Colleen Hoover"],"isbn":"9781785412691","subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9219001-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":12,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000013","title":"Outcast — journey demo copy","authors":["Erin Hunter"],"isbn":"9780061651281","subjects":["Fantasy"],"publicationyear":2008,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7027037-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":13,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000014","title":"Papillon — journey demo copy","authors":["Henri Charrière"],"isbn":"0688022693","subjects":["Biography"],"publicationyear":1969,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8752-L.jpg","openlibraryid":null,"mrtcode":"NS24","scenario":14,"condition":"good"},
{"id":"de000008-0000-4000-8000-000000000011","title":"The Call of the Wild","authors":["Jack London"],"subjects":["Adventure"],"description":"Adventure selection for community reading: The Call of the Wild.","mrtcode":"EW12","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000012","title":"The Three Musketeers","authors":["Alexandre Dumas"],"subjects":["Adventure"],"description":"Adventure selection for community reading: The Three Musketeers.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000013","title":"Journey to the Centre of the Earth","authors":["Jules Verne"],"subjects":["Adventure"],"description":"Adventure selection for community reading: Journey to the Centre of the Earth.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000014","title":"Around the World in Eighty Days","authors":["Jules Verne"],"subjects":["Adventure"],"description":"Adventure selection for community reading: Around the World in Eighty Days.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000021","title":"The Story of Art","authors":["E. H. Gombrich"],"subjects":["Art"],"description":"Art selection for community reading: The Story of Art.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000022","title":"The Lives of the Artists","authors":["Giorgio Vasari"],"subjects":["Art"],"description":"Art selection for community reading: The Lives of the Artists.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000023","title":"Concerning the Spiritual in Art","authors":["Wassily Kandinsky"],"subjects":["Art"],"description":"Art selection for community reading: Concerning the Spiritual in Art.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000024","title":"Interaction of Color","authors":["Josef Albers"],"subjects":["Art"],"description":"Art selection for community reading: Interaction of Color.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000031","title":"The Story of My Life","authors":["Helen Keller"],"subjects":["Biography"],"description":"Biography selection for community reading: The Story of My Life.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000032","title":"Long Walk to Freedom","authors":["Nelson Mandela"],"subjects":["Biography"],"description":"Biography selection for community reading: Long Walk to Freedom.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000033","title":"I Know Why the Caged Bird Sings","authors":["Maya Angelou"],"subjects":["Biography"],"description":"Biography selection for community reading: I Know Why the Caged Bird Sings.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000034","title":"The Autobiography of Malcolm X","authors":["Malcolm X","Alex Haley"],"subjects":["Biography"],"description":"Biography selection for community reading: The Autobiography of Malcolm X.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000041","title":"Good to Great","authors":["Jim Collins"],"subjects":["Business"],"description":"Business selection for community reading: Good to Great.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000042","title":"The Innovator's Dilemma","authors":["Clayton M. Christensen"],"subjects":["Business"],"description":"Business selection for community reading: The Innovator's Dilemma.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000043","title":"The Personal MBA","authors":["Josh Kaufman"],"subjects":["Business"],"description":"Business selection for community reading: The Personal MBA.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000044","title":"The E-Myth Revisited","authors":["Michael E. Gerber"],"subjects":["Business"],"description":"Business selection for community reading: The E-Myth Revisited.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000051","title":"Matilda","authors":["Roald Dahl"],"subjects":["Children"],"description":"Children selection for community reading: Matilda.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000052","title":"The Very Hungry Caterpillar","authors":["Eric Carle"],"subjects":["Children"],"description":"Children selection for community reading: The Very Hungry Caterpillar.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000053","title":"The Tale of Peter Rabbit","authors":["Beatrix Potter"],"subjects":["Children"],"description":"Children selection for community reading: The Tale of Peter Rabbit.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000054","title":"Winnie-the-Pooh","authors":["A. A. Milne"],"subjects":["Children"],"description":"Children selection for community reading: Winnie-the-Pooh.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000061","title":"Maus","authors":["Art Spiegelman"],"subjects":["Comics"],"description":"Comics selection for community reading: Maus.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000062","title":"Persepolis","authors":["Marjane Satrapi"],"subjects":["Comics"],"description":"Comics selection for community reading: Persepolis.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000063","title":"Nimona","authors":["ND Stevenson"],"subjects":["Comics"],"description":"Comics selection for community reading: Nimona.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000064","title":"American Born Chinese","authors":["Gene Luen Yang"],"subjects":["Comics"],"description":"Comics selection for community reading: American Born Chinese.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000071","title":"The Joy of Cooking","authors":["Irma S. Rombauer"],"subjects":["Cooking"],"description":"Cooking selection for community reading: The Joy of Cooking.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000072","title":"Mastering the Art of French Cooking","authors":["Julia Child","Simone Beck","Louisette Bertholle"],"subjects":["Cooking"],"description":"Cooking selection for community reading: Mastering the Art of French Cooking.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000073","title":"The Food Lab","authors":["J. Kenji López-Alt"],"subjects":["Cooking"],"description":"Cooking selection for community reading: The Food Lab.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000074","title":"The Wok","authors":["J. Kenji López-Alt"],"subjects":["Cooking"],"description":"Cooking selection for community reading: The Wok.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000081","title":"A Wizard of Earthsea","authors":["Ursula K. Le Guin"],"subjects":["Fantasy"],"description":"Fantasy selection for community reading: A Wizard of Earthsea.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000082","title":"Howl's Moving Castle","authors":["Diana Wynne Jones"],"subjects":["Fantasy"],"description":"Fantasy selection for community reading: Howl's Moving Castle.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000083","title":"The Last Unicorn","authors":["Peter S. Beagle"],"subjects":["Fantasy"],"description":"Fantasy selection for community reading: The Last Unicorn.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000084","title":"The Lion, the Witch and the Wardrobe","authors":["C. S. Lewis"],"subjects":["Fantasy"],"description":"Fantasy selection for community reading: The Lion, the Witch and the Wardrobe.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000091","title":"Jane Eyre","authors":["Charlotte Brontë"],"subjects":["Fiction"],"description":"Fiction selection for community reading: Jane Eyre.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000092","title":"Great Expectations","authors":["Charles Dickens"],"subjects":["Fiction"],"description":"Fiction selection for community reading: Great Expectations.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000093","title":"To Kill a Mockingbird","authors":["Harper Lee"],"subjects":["Fiction"],"description":"Fiction selection for community reading: To Kill a Mockingbird.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000094","title":"Things Fall Apart","authors":["Chinua Achebe"],"subjects":["Fiction"],"description":"Fiction selection for community reading: Things Fall Apart.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000101","title":"Being Mortal","authors":["Atul Gawande"],"subjects":["Health"],"description":"Health selection for community reading: Being Mortal.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000102","title":"The Body Keeps the Score","authors":["Bessel van der Kolk"],"subjects":["Health"],"description":"Health selection for community reading: The Body Keeps the Score.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000103","title":"The Body","authors":["Bill Bryson"],"subjects":["Health"],"description":"Health selection for community reading: The Body.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000104","title":"Exercised","authors":["Daniel E. Lieberman"],"subjects":["Health"],"description":"Health selection for community reading: Exercised.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000111","title":"The Book Thief","authors":["Markus Zusak"],"subjects":["Historical fiction"],"description":"Historical fiction selection for community reading: The Book Thief.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000112","title":"All the Light We Cannot See","authors":["Anthony Doerr"],"subjects":["Historical fiction"],"description":"Historical fiction selection for community reading: All the Light We Cannot See.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000113","title":"The Pillars of the Earth","authors":["Ken Follett"],"subjects":["Historical fiction"],"description":"Historical fiction selection for community reading: The Pillars of the Earth.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000114","title":"A Tale of Two Cities","authors":["Charles Dickens"],"subjects":["Historical fiction"],"description":"Historical fiction selection for community reading: A Tale of Two Cities.","mrtcode":"NS17","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000121","title":"SPQR","authors":["Mary Beard"],"subjects":["History"],"description":"History selection for community reading: SPQR.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000122","title":"The Silk Roads","authors":["Peter Frankopan"],"subjects":["History"],"description":"History selection for community reading: The Silk Roads.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000123","title":"The Histories","authors":["Herodotus"],"subjects":["History"],"description":"History selection for community reading: The Histories.","mrtcode":"NS17","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000124","title":"The Rise and Fall of the Third Reich","authors":["William L. Shirer"],"subjects":["History"],"description":"History selection for community reading: The Rise and Fall of the Third Reich.","mrtcode":"NS24","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000131","title":"Frankenstein","authors":["Mary Shelley"],"subjects":["Horror"],"description":"Horror selection for community reading: Frankenstein.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000132","title":"The Haunting of Hill House","authors":["Shirley Jackson"],"subjects":["Horror"],"description":"Horror selection for community reading: The Haunting of Hill House.","mrtcode":"NS17","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000133","title":"The Shining","authors":["Stephen King"],"subjects":["Horror"],"description":"Horror selection for community reading: The Shining.","mrtcode":"NS24","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000134","title":"The Turn of the Screw","authors":["Henry James"],"subjects":["Horror"],"description":"Horror selection for community reading: The Turn of the Screw.","mrtcode":"EW12","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000141","title":"The Murder of Roger Ackroyd","authors":["Agatha Christie"],"subjects":["Mystery"],"description":"Mystery selection for community reading: The Murder of Roger Ackroyd.","mrtcode":"NS17","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000142","title":"The Moonstone","authors":["Wilkie Collins"],"subjects":["Mystery"],"description":"Mystery selection for community reading: The Moonstone.","mrtcode":"NS24","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000143","title":"The Maltese Falcon","authors":["Dashiell Hammett"],"subjects":["Mystery"],"description":"Mystery selection for community reading: The Maltese Falcon.","mrtcode":"EW12","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000144","title":"The Big Sleep","authors":["Raymond Chandler"],"subjects":["Mystery"],"description":"Mystery selection for community reading: The Big Sleep.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000151","title":"Silent Spring","authors":["Rachel Carson"],"subjects":["Nonfiction"],"description":"Nonfiction selection for community reading: Silent Spring.","mrtcode":"NS24","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000152","title":"The Immortal Life of Henrietta Lacks","authors":["Rebecca Skloot"],"subjects":["Nonfiction"],"description":"Nonfiction selection for community reading: The Immortal Life of Henrietta Lacks.","mrtcode":"EW12","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000153","title":"The Right Stuff","authors":["Tom Wolfe"],"subjects":["Nonfiction"],"description":"Nonfiction selection for community reading: The Right Stuff.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000154","title":"The Year of Magical Thinking","authors":["Joan Didion"],"subjects":["Nonfiction"],"description":"Nonfiction selection for community reading: The Year of Magical Thinking.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000161","title":"The Republic","authors":["Plato"],"subjects":["Philosophy"],"description":"Philosophy selection for community reading: The Republic.","mrtcode":"EW12","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000162","title":"Beyond Good and Evil","authors":["Friedrich Nietzsche"],"subjects":["Philosophy"],"description":"Philosophy selection for community reading: Beyond Good and Evil.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000163","title":"The Problems of Philosophy","authors":["Bertrand Russell"],"subjects":["Philosophy"],"description":"Philosophy selection for community reading: The Problems of Philosophy.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000164","title":"The Nicomachean Ethics","authors":["Aristotle"],"subjects":["Philosophy"],"description":"Philosophy selection for community reading: The Nicomachean Ethics.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000171","title":"The Waste Land","authors":["T. S. Eliot"],"subjects":["Poetry"],"description":"Poetry selection for community reading: The Waste Land.","mrtcode":"NS25","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000172","title":"The Raven and Other Poems","authors":["Edgar Allan Poe"],"subjects":["Poetry"],"description":"Poetry selection for community reading: The Raven and Other Poems.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000173","title":"Songs of Innocence and of Experience","authors":["William Blake"],"subjects":["Poetry"],"description":"Poetry selection for community reading: Songs of Innocence and of Experience.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000174","title":"Ariel","authors":["Sylvia Plath"],"subjects":["Poetry"],"description":"Poetry selection for community reading: Ariel.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000181","title":"The Varieties of Religious Experience","authors":["William James"],"subjects":["Religion"],"description":"Religion selection for community reading: The Varieties of Religious Experience.","mrtcode":"EW2","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000182","title":"The Bhagavad Gita","authors":["Eknath Easwaran"],"subjects":["Religion"],"description":"Religion selection for community reading: The Bhagavad Gita.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000183","title":"The Dhammapada","authors":["Eknath Easwaran"],"subjects":["Religion"],"description":"Religion selection for community reading: The Dhammapada.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000184","title":"The Confessions","authors":["Augustine of Hippo"],"subjects":["Religion"],"description":"Religion selection for community reading: The Confessions.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000191","title":"North and South","authors":["Elizabeth Gaskell"],"subjects":["Romance"],"description":"Romance selection for community reading: North and South.","mrtcode":"NS17","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000192","title":"The Grand Sophy","authors":["Georgette Heyer"],"subjects":["Romance"],"description":"Romance selection for community reading: The Grand Sophy.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000193","title":"The Kiss Quotient","authors":["Helen Hoang"],"subjects":["Romance"],"description":"Romance selection for community reading: The Kiss Quotient.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000194","title":"Beach Read","authors":["Emily Henry"],"subjects":["Romance"],"description":"Romance selection for community reading: Beach Read.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000201","title":"Cosmos","authors":["Carl Sagan"],"subjects":["Science"],"description":"Science selection for community reading: Cosmos.","mrtcode":"NS24","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000202","title":"The Selfish Gene","authors":["Richard Dawkins"],"subjects":["Science"],"description":"Science selection for community reading: The Selfish Gene.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000203","title":"The Origin of Species","authors":["Charles Darwin"],"subjects":["Science"],"description":"Science selection for community reading: The Origin of Species.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000204","title":"The Double Helix","authors":["James D. Watson"],"subjects":["Science"],"description":"Science selection for community reading: The Double Helix.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000211","title":"The Left Hand of Darkness","authors":["Ursula K. Le Guin"],"subjects":["Science fiction"],"description":"Science fiction selection for community reading: The Left Hand of Darkness.","mrtcode":"EW12","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000212","title":"The War of the Worlds","authors":["H. G. Wells"],"subjects":["Science fiction"],"description":"Science fiction selection for community reading: The War of the Worlds.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000213","title":"Foundation","authors":["Isaac Asimov"],"subjects":["Science fiction"],"description":"Science fiction selection for community reading: Foundation.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000214","title":"The Hitchhiker's Guide to the Galaxy","authors":["Douglas Adams"],"subjects":["Science fiction"],"description":"Science fiction selection for community reading: The Hitchhiker's Guide to the Galaxy.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000221","title":"The 7 Habits of Highly Effective People","authors":["Stephen R. Covey"],"subjects":["Self-help"],"description":"Self-help selection for community reading: The 7 Habits of Highly Effective People.","mrtcode":"NS25","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000222","title":"How to Win Friends and Influence People","authors":["Dale Carnegie"],"subjects":["Self-help"],"description":"Self-help selection for community reading: How to Win Friends and Influence People.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000223","title":"Mindset","authors":["Carol S. Dweck"],"subjects":["Self-help"],"description":"Self-help selection for community reading: Mindset.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000224","title":"Getting Things Done","authors":["David Allen"],"subjects":["Self-help"],"description":"Self-help selection for community reading: Getting Things Done.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000231","title":"Code","authors":["Charles Petzold"],"subjects":["Technology"],"description":"Technology selection for community reading: Code.","mrtcode":"EW2","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000232","title":"The Mythical Man-Month","authors":["Frederick P. Brooks Jr."],"subjects":["Technology"],"description":"Technology selection for community reading: The Mythical Man-Month.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000233","title":"The Design of Everyday Things","authors":["Don Norman"],"subjects":["Technology"],"description":"Technology selection for community reading: The Design of Everyday Things.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000234","title":"The Soul of a New Machine","authors":["Tracy Kidder"],"subjects":["Technology"],"description":"Technology selection for community reading: The Soul of a New Machine.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000241","title":"The Spy Who Came in from the Cold","authors":["John le Carré"],"subjects":["Thriller"],"description":"Thriller selection for community reading: The Spy Who Came in from the Cold.","mrtcode":"NS17","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000242","title":"The Bourne Identity","authors":["Robert Ludlum"],"subjects":["Thriller"],"description":"Thriller selection for community reading: The Bourne Identity.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000243","title":"The Firm","authors":["John Grisham"],"subjects":["Thriller"],"description":"Thriller selection for community reading: The Firm.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000244","title":"Rebecca","authors":["Daphne du Maurier"],"subjects":["Thriller"],"description":"Thriller selection for community reading: Rebecca.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000251","title":"A Walk in the Woods","authors":["Bill Bryson"],"subjects":["Travel"],"description":"Travel selection for community reading: A Walk in the Woods.","mrtcode":"NS24","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000252","title":"The Great Railway Bazaar","authors":["Paul Theroux"],"subjects":["Travel"],"description":"Travel selection for community reading: The Great Railway Bazaar.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000253","title":"Travels with Charley","authors":["John Steinbeck"],"subjects":["Travel"],"description":"Travel selection for community reading: Travels with Charley.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000254","title":"The Old Patagonian Express","authors":["Paul Theroux"],"subjects":["Travel"],"description":"Travel selection for community reading: The Old Patagonian Express.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000261","title":"The Outsiders","authors":["S. E. Hinton"],"subjects":["Young adult"],"description":"Young adult selection for community reading: The Outsiders.","mrtcode":"EW12","condition":"fair"},
{"id":"de000008-0000-4000-8000-000000000262","title":"The Giver","authors":["Lois Lowry"],"subjects":["Young adult"],"description":"Young adult selection for community reading: The Giver.","mrtcode":"NS25","condition":"like new"},
{"id":"de000008-0000-4000-8000-000000000263","title":"The Fault in Our Stars","authors":["John Green"],"subjects":["Young adult"],"description":"Young adult selection for community reading: The Fault in Our Stars.","mrtcode":"EW2","condition":"good"},
{"id":"de000008-0000-4000-8000-000000000264","title":"The Hate U Give","authors":["Angie Thomas"],"subjects":["Young adult"],"description":"Young adult selection for community reading: The Hate U Give.","mrtcode":"NS17","condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000015","title":"Born a Crime — journey demo copy 2","authors":["Trevor Noah"],"isbn":"3896675907","subjects":["Biography"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8294078-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":1,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000016","title":"Devil and the Deep Sea — journey demo copy 2","authors":["Sara Craven"],"isbn":"9780373111435","subjects":["Romance"],"publicationyear":1988,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9620545-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":2,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000017","title":"Educated — journey demo copy 2","authors":["Tara Westover","Orah Danḳner"],"isbn":"9722533797","subjects":["Biography"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8314077-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":3,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000018","title":"Five on a Treasure Island — journey demo copy 2","authors":["Enid Blyton"],"isbn":"9798511735979","subjects":["Adventure"],"publicationyear":1942,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14570937-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":4,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000019","title":"Howl, and Other Poems — journey demo copy 2","authors":["Allen Ginsberg"],"isbn":"0872860175","subjects":["Poetry"],"publicationyear":1956,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662901-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":5,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000020","title":"I Don't Love You Anymore — journey demo copy 2","authors":["Rithvik Singh"],"isbn":"0143469134","subjects":["Poetry"],"publicationyear":2024,"description":"","coverurl":"https://covers.openlibrary.org/b/id/15116470-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":6,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000021","title":"Ikigai — journey demo copy 2","authors":["Chiemi Souen","Flor Kaneshiro"],"isbn":"9781953021168","subjects":["Biography"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13110612-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":7,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000022","title":"It Starts with Us — journey demo copy 2","authors":["Colleen Hoover"],"isbn":"9781797145105","subjects":["Romance"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12749873-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":8,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000023","title":"Married at first sight — journey demo copy 2","authors":["Gu Lingfei"],"isbn":null,"subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14312142-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":9,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000024","title":"Milk and Honey — journey demo copy 2","authors":["Rupi Kaur"],"isbn":"9781449483135","subjects":["Poetry"],"publicationyear":2014,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8743595-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":10,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000025","title":"Neverseen — journey demo copy 2","authors":["Shannon Messenger"],"isbn":"2266272675","subjects":["Fantasy"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7990188-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":11,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000026","title":"November 9 — journey demo copy 2","authors":["Colleen Hoover"],"isbn":"9781785412691","subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9219001-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":12,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000027","title":"Outcast — journey demo copy 2","authors":["Erin Hunter"],"isbn":"9780061651281","subjects":["Fantasy"],"publicationyear":2008,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7027037-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":13,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000028","title":"Papillon — journey demo copy 2","authors":["Henri Charrière"],"isbn":"0688022693","subjects":["Biography"],"publicationyear":1969,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8752-L.jpg","openlibraryid":null,"mrtcode":"EW12","scenario":14,"condition":"good"},
{"id":"de000002-0000-4000-8000-000000000029","title":"Born a Crime — journey demo copy 3","authors":["Trevor Noah"],"isbn":"3896675907","subjects":["Biography"],"publicationyear":2016,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8294078-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":1,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000030","title":"Devil and the Deep Sea — journey demo copy 3","authors":["Sara Craven"],"isbn":"9780373111435","subjects":["Romance"],"publicationyear":1988,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9620545-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":2,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000031","title":"Educated — journey demo copy 3","authors":["Tara Westover","Orah Danḳner"],"isbn":"9722533797","subjects":["Biography"],"publicationyear":2018,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8314077-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":3,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000032","title":"Five on a Treasure Island — journey demo copy 3","authors":["Enid Blyton"],"isbn":"9798511735979","subjects":["Adventure"],"publicationyear":1942,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14570937-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":4,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000033","title":"Howl, and Other Poems — journey demo copy 3","authors":["Allen Ginsberg"],"isbn":"0872860175","subjects":["Poetry"],"publicationyear":1956,"description":"","coverurl":"https://covers.openlibrary.org/b/id/662901-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":5,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000034","title":"I Don't Love You Anymore — journey demo copy 3","authors":["Rithvik Singh"],"isbn":"0143469134","subjects":["Poetry"],"publicationyear":2024,"description":"","coverurl":"https://covers.openlibrary.org/b/id/15116470-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":6,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000035","title":"Ikigai — journey demo copy 3","authors":["Chiemi Souen","Flor Kaneshiro"],"isbn":"9781953021168","subjects":["Biography"],"publicationyear":2021,"description":"","coverurl":"https://covers.openlibrary.org/b/id/13110612-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":7,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000036","title":"It Starts with Us — journey demo copy 3","authors":["Colleen Hoover"],"isbn":"9781797145105","subjects":["Romance"],"publicationyear":2022,"description":"","coverurl":"https://covers.openlibrary.org/b/id/12749873-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":8,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000037","title":"Married at first sight — journey demo copy 3","authors":["Gu Lingfei"],"isbn":null,"subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/14312142-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":9,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000038","title":"Milk and Honey — journey demo copy 3","authors":["Rupi Kaur"],"isbn":"9781449483135","subjects":["Poetry"],"publicationyear":2014,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8743595-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":10,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000039","title":"Neverseen — journey demo copy 3","authors":["Shannon Messenger"],"isbn":"2266272675","subjects":["Fantasy"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7990188-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":11,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000040","title":"November 9 — journey demo copy 3","authors":["Colleen Hoover"],"isbn":"9781785412691","subjects":["Romance"],"publicationyear":2015,"description":"","coverurl":"https://covers.openlibrary.org/b/id/9219001-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":12,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000041","title":"Outcast — journey demo copy 3","authors":["Erin Hunter"],"isbn":"9780061651281","subjects":["Fantasy"],"publicationyear":2008,"description":"","coverurl":"https://covers.openlibrary.org/b/id/7027037-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":13,"condition":"fair"},
{"id":"de000002-0000-4000-8000-000000000042","title":"Papillon — journey demo copy 3","authors":["Henri Charrière"],"isbn":"0688022693","subjects":["Biography"],"publicationyear":1969,"description":"","coverurl":"https://covers.openlibrary.org/b/id/8752-L.jpg","openlibraryid":null,"mrtcode":"NS25","scenario":14,"condition":"fair"}
]$books$::jsonb)
    as b(id uuid,title text,authors text[],isbn text,subjects text[],publicationyear integer,
      description text,coverurl text,openlibraryid text,mrtcode text,scenario integer,condition text);
  -- A fixture used by another customer is no longer disposable demo data.
  delete from demo_seed_books d where exists(select 1 from public.adoptionapplications a where a.bookid=d.id and a.userid<>customer_id)
    or exists(select 1 from public.appointments a where a.bookid=d.id and a.userid<>customer_id)
    or exists(select 1 from public.watchlist w where w.bookid=d.id and w.userid<>customer_id)
    or exists(select 1 from public.books b where b.id=d.id and b.ownerid is not null);
  delete from public.appointments where userid=customer_id and bookid in (select id from demo_seed_books);
  delete from public.adoptionapplications where userid=customer_id and bookid in (select id from demo_seed_books);
  delete from public.watchlist where userid=customer_id and bookid in (select id from demo_seed_books);
  insert into public.books(id,title,authors,isbn,subjects,publicationyear,description,coverurl,openlibraryid,source,status,mrtstationid,createdby,condition)
  select b.id,b.title,b.authors,b.isbn,b.subjects,b.publicationyear,coalesce(b.description,''),b.coverurl,b.openlibraryid,
    case when b.openlibraryid is null then 'manual' else 'open_library' end,'available',s.id,admin_id,b.condition
  from demo_seed_books b join public.mrtstations s on b.mrtcode=any(s.codes)
  on conflict(id) do update set title=excluded.title,authors=excluded.authors,isbn=excluded.isbn,subjects=excluded.subjects,
    publicationyear=excluded.publicationyear,description=excluded.description,coverurl=excluded.coverurl,
    openlibraryid=excluded.openlibraryid,source=excluded.source,
    mrtstationid=excluded.mrtstationid,status='available',condition=excluded.condition,updatedat=now();

  -- Save before approval: the watchlist trigger only accepts available books.
  -- Scenario 5 becomes reserved; scenario 10 becomes adopted (3 copies each).
  insert into public.watchlist(id,userid,bookid,comments)
  select b.id,customer_id,b.id,
    case when d.scenario=5 then 'Waiting to confirm pickup for this saved book.'
      when d.scenario=10 then 'Saved before adoption; keep this as reading history.'
      else 'Next on my reading list: ' || b.title end
  from public.books b join demo_seed_books d on d.id=b.id
  where d.scenario in (5,10) or b.id in (
    select b2.id from public.books b2 join demo_seed_books d2 on d2.id=b2.id
    where d2.scenario is null and b2.subjects && array['Fantasy','Romance'] order by b2.id limit 3
  );

  -- Three independent copies per journey: approval, rejection, withdrawal, arrange, waiting,
  -- tomorrow/today/overdue confirmations, expired proposal, collected, cancelled,
  -- declined, a legacy three-option request, and incomplete legacy information.
  for item in
    select b.*,d.scenario,right(d.id::text,12)::integer as fixture_no
    from public.books b join demo_seed_books d on d.id=b.id
    where d.scenario is not null order by d.scenario,fixture_no
  loop
    application_id := ('de000005-0000-4000-8000-' || lpad(item.fixture_no::text,12,'0'))::uuid;
    appointment_id := ('de000006-0000-4000-8000-' || lpad(item.fixture_no::text,12,'0'))::uuid;
    insert into public.adoptionapplications(id,userid,bookid) values(application_id,customer_id,item.id);
    if item.scenario=1 then continue; end if;
    if item.scenario=2 then perform public.decide_book_application(application_id,admin_id,'rejected'); continue; end if;
    if item.scenario=3 then update public.adoptionapplications set status='cancelled' where id=application_id; continue; end if;
    perform public.decide_book_application(application_id,admin_id,'approved');
    if item.scenario=4 then continue; end if;
    pickup_date := case
      when item.scenario in (8,9,10) then today-2
      when item.scenario=7 then today
      when item.scenario=6 then today+1
      else today+2 end;
    proposed := jsonb_build_array(
      jsonb_build_object('appointmentdate',pickup_date,'timeslot','10:00–11:00'),
      jsonb_build_object('appointmentdate',pickup_date,'timeslot','14:00–15:00'));
    if item.scenario=13 then proposed := proposed || jsonb_build_array(jsonb_build_object('appointmentdate',pickup_date,'timeslot','16:00–17:00')); end if;
    if item.scenario=14 then proposed := '[]'::jsonb; end if;
    selected_status := case when item.scenario in (6,7,8) then 'appointment confirmed' when item.scenario=10 then 'collected'
      when item.scenario=11 then 'cancelled' when item.scenario=12 then 'rejected' else 'pending confirmation' end;
    insert into public.appointments(id,userid,bookid,booktitle,location,appointmentdate,timeslot,status,pickupoptions,optionsby,proposalversion)
    values(appointment_id,customer_id,item.id,item.title,item.collectionarea,pickup_date,
      case when item.scenario=14 then 'Time to be arranged' else '10:00–11:00' end,selected_status,proposed,
      case when item.scenario=14 then null else 'customer' end,
      case when item.scenario=14 then null else ('de000007-0000-4000-8000-' || lpad(item.fixture_no::text,12,'0'))::uuid end);
    if item.scenario=10 then update public.books set status='adopted' where id=item.id; end if;
  end loop;

  create temporary table demo_seed_drives on commit drop as
  select * from jsonb_to_recordset($drives$[
{"id":"0362bead-243b-4449-a430-59ae38752e34","title":"Community Book Swap","location":"Dhoby Ghaut MRT","daysfromnow":14,"description":"Bring a book and find your next read.","maxcapacity":40,"status":"open","mrtcode":"NS24","registered":true},
{"id":"55d453df-48fc-405a-8ee4-397466b15e6f","title":"Weekend Book Adoption","location":"Bugis MRT","daysfromnow":28,"description":"Discover books shared by the community.","maxcapacity":40,"status":"open","mrtcode":"EW12","registered":false},
{"id":"ede2b15f-a4e2-418e-8833-b3dd4abcac53","title":"Neighbourhood Reading Day","location":"City Hall MRT","daysfromnow":42,"description":"Meet readers and browse books for adoption.","maxcapacity":40,"status":"open","mrtcode":"NS25","registered":true},
{"id":"a4fb0a2c-5b13-4915-a812-97663c533f8f","title":"Books for Everyone","location":"Tampines MRT","daysfromnow":56,"description":"Share stories and take home a new read.","maxcapacity":40,"status":"open","mrtcode":"EW2","registered":false},
{"id":"5096d7c2-3cc3-4935-b0af-6e9bc6cabc70","title":"Library Friends Meetup","location":"Bishan MRT","daysfromnow":70,"description":"Browse community books and meet fellow readers.","maxcapacity":40,"status":"open","mrtcode":"NS17","registered":true},
{"id":"de000003-0000-4000-8000-000000000001","title":"Today’s reading meetup","location":"Dhoby Ghaut MRT","daysfromnow":0,"status":"open","maxcapacity":20,"mrtcode":"NS24","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000002","title":"Fully booked community drive","location":"Dhoby Ghaut MRT","daysfromnow":3,"status":"open","maxcapacity":1,"mrtcode":"NS24","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000003","title":"Registration closed","location":"Dhoby Ghaut MRT","daysfromnow":4,"status":"closed","maxcapacity":20,"mrtcode":"NS24","registered":false,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000004","title":"Cancelled community drive","location":"Dhoby Ghaut MRT","daysfromnow":5,"status":"cancelled","maxcapacity":20,"mrtcode":"NS24","registered":false,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000005","title":"Last week’s book drive","location":"Dhoby Ghaut MRT","daysfromnow":-7,"status":"closed","maxcapacity":20,"mrtcode":"NS24","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000006","title":"Today’s reading meetup — session 2","location":"Bugis MRT","daysfromnow":0,"status":"open","maxcapacity":20,"mrtcode":"EW12","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000007","title":"Fully booked community drive — session 2","location":"Bugis MRT","daysfromnow":3,"status":"open","maxcapacity":1,"mrtcode":"EW12","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000008","title":"Registration closed — session 2","location":"Bugis MRT","daysfromnow":4,"status":"closed","maxcapacity":20,"mrtcode":"EW12","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000009","title":"Cancelled community drive — session 2","location":"Bugis MRT","daysfromnow":5,"status":"cancelled","maxcapacity":20,"mrtcode":"EW12","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000010","title":"Last week’s book drive — session 2","location":"Bugis MRT","daysfromnow":-7,"status":"closed","maxcapacity":20,"mrtcode":"EW12","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000011","title":"Today’s reading meetup — session 3","location":"City Hall MRT","daysfromnow":0,"status":"open","maxcapacity":20,"mrtcode":"NS25","registered":false,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000012","title":"Fully booked community drive — session 3","location":"City Hall MRT","daysfromnow":3,"status":"open","maxcapacity":1,"mrtcode":"NS25","registered":true,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000013","title":"Registration closed — session 3","location":"City Hall MRT","daysfromnow":4,"status":"closed","maxcapacity":20,"mrtcode":"NS25","registered":false,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000014","title":"Cancelled community drive — session 3","location":"City Hall MRT","daysfromnow":5,"status":"cancelled","maxcapacity":20,"mrtcode":"NS25","registered":false,"description":"Demo drive scheduling and registration."},
{"id":"de000003-0000-4000-8000-000000000015","title":"Last week’s book drive — session 3","location":"City Hall MRT","daysfromnow":-7,"status":"closed","maxcapacity":20,"mrtcode":"NS25","registered":false,"description":"Demo drive scheduling and registration."}
]$drives$::jsonb)
    as d(id uuid,title text,location text,daysfromnow integer,description text,maxcapacity integer,status text,mrtcode text,registered boolean);
  delete from demo_seed_drives d where exists(select 1 from public.adoptiondrives a where a.id=d.id and exists(select 1 from unnest(a.userids) u where u<>customer_id));
  -- Historical fixtures deliberately predate today; all capacity and date values
  -- below are explicit. The trigger is restored within this atomic statement.
  alter table public.adoptiondrives disable trigger check_drive_capacity;
  insert into public.adoptiondrives(id,title,location,eventdate,starttime,endtime,description,maxcapacity,status,mrtstationid,userids,createdby,closedbycapacity)
  select d.id,d.title,d.location,today+d.daysfromnow,'10:00'::time,'16:00'::time,coalesce(d.description,''),d.maxcapacity,
    case when d.maxcapacity=1 and d.registered then 'closed' else d.status end,s.id,
    case when d.registered then array[customer_id] else '{}'::uuid[] end,admin_id,coalesce(d.maxcapacity=1 and d.registered,false)
  from demo_seed_drives d join public.mrtstations s on d.mrtcode=any(s.codes)
  on conflict(id) do update set title=excluded.title,location=excluded.location,eventdate=excluded.eventdate,
    starttime=excluded.starttime,endtime=excluded.endtime,description=excluded.description,maxcapacity=excluded.maxcapacity,
    status=excluded.status,mrtstationid=excluded.mrtstationid,userids=excluded.userids,closedbycapacity=excluded.closedbycapacity,updatedat=now();
  alter table public.adoptiondrives enable trigger check_drive_capacity;
  drop table demo_seed_books, demo_seed_drives;
end;
$seed$;
