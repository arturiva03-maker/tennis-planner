/* eslint-disable */
const fs = require("fs");
const path = require("path");

// ---- Spieler aus Supabase (account 9168a8e1, mit nachname) ----
const SPIELER = [
  {id:"28c13f44-ef89-40f2-bd59-41dd3af36228",v:"Juna",n:"Abromeit"},
  {id:"2dc76a17-b082-4580-bb78-1be19dcdc172",v:"Damla",n:"Akbas"},
  {id:"c1f81670-d72a-4193-b3b6-516fc67e7ae6",v:"Marcel",n:"Akcali"},
  {id:"81310d70-33bd-46c7-ae34-8a277022cf43",v:"Anne",n:"Albrecht"},
  {id:"42cbbba6-2cc6-4c24-ab4f-0e5eb0e55586",v:"Jood",n:"Alzain"},
  {id:"6af9c7c0-b72d-4ec3-bd02-ba9af861b232",v:"Alma von",n:"Anhalt"},
  {id:"ee00b18d-b901-41a1-84c3-8de3831662b6",v:"Jannis",n:"Arnold"},
  {id:"2b66dd6b-6bf3-454f-bb23-b190afb8ad5c",v:"Anthony",n:"Bartlomiey"},
  {id:"3f4e15d2-9730-46b2-a339-a67e5dd04ca2",v:"Leska",n:"Bartmann"},
  {id:"3a23f4d3-b8e0-4dad-8ee2-8472137debae",v:"Julie",n:"Bäßler"},
  {id:"95577594-9bd8-4a6c-a742-2231d96c7b17",v:"Hauke",n:"Basterd"},
  {id:"580358b4-a08a-44c0-bd98-7e0f1fcd6569",v:"Mara",n:"Bäuchler"},
  {id:"c83d6e9c-2161-482c-b28a-d8f8d75230f5",v:"Raphael",n:"Bayer"},
  {id:"d6757a7f-e248-4ae6-900e-cc0b8e77655f",v:"Özgür",n:"Bayraktar"},
  {id:"e599f523-1f31-430e-822f-cc9b6783eeee",v:"Maite",n:"Beecken"},
  {id:"9e8e8a8e-6073-4699-809b-fc20380ad82b",v:"Ava",n:"Behmer"},
  {id:"bdebc1e1-d3ba-4ef2-b865-fc6524d2d6ef",v:"lena",n:"belting"},
  {id:"becf27c2-8caa-42e5-8fd3-b1a2e189aa54",v:"Murathan",n:"Berber"},
  {id:"ce282fb5-7ba5-49d3-85f4-3bc6bc538bf3",v:"Marius",n:"Bessenbach"},
  {id:"45ed7423-b729-4590-8e76-4208c11202bc",v:"Sven",n:"Beverst"},
  {id:"74f15e71-a4c2-4edd-9315-67aca02dcf80",v:"Sören",n:"Biermann"},
  {id:"ae88f33d-5b7c-413e-a9b0-d3fabd6a6533",v:"Calle",n:"Billger"},
  {id:"5780beb7-cc44-4267-9e3a-f65194f8a1c0",v:"Jennifer",n:"Billger"},
  {id:"ef2887c7-3125-4344-b4b2-8bacfd4b8e72",v:"Igor",n:"Blaszczyk"},
  {id:"9e68dc9e-d155-4914-9dde-b4141ffade95",v:"Laura",n:"Block"},
  {id:"5727e8c7-df65-46f7-aadb-1c2e44854530",v:"Nina",n:"Böing"},
  {id:"006c9d60-aa1b-4855-a4b8-0e0a7f683caf",v:"Hamza",n:"Bouzidi"},
  {id:"4aee1c14-02b6-43be-84e0-4afb94564fdc",v:"David",n:"Brandenburg"},
  {id:"bbda2433-00ea-433f-8957-819eb08bb8d1",v:"Herren",n:"Britz"},
  {id:"1681c16c-7f65-4e82-95ff-92ff05fe3ddd",v:"Jan",n:"Bruder"},
  {id:"f337aecc-dbad-4558-bc31-ff9186249fa5",v:"Alexander",n:"Burdzenidze"},
  {id:"ef4fe8ef-0bf4-4132-9006-f631554ed144",v:"Charlotte",n:"Chen"},
  {id:"9e9e1c62-3fb1-4156-b3f0-723b8b67d994",v:"Sandy",n:"Chung"},
  {id:"38172ca6-b94c-4c61-8239-11f982ee9ada",v:"Alessandro",n:"Close"},
  {id:"6325cba8-9684-4177-a614-db2f97cbdbf9",v:"Rosa",n:"Dabrowska"},
  {id:"e445c33f-6192-4fa5-942a-25a68b6233ce",v:"Simon",n:"de Azevedo"},
  {id:"960df168-737a-4dda-ac90-4a6df27e433d",v:"Alison",n:"Detterer"},
  {id:"a1fa406c-7039-441d-ac9b-00654fccb344",v:"Noah",n:"Dick"},
  {id:"b68e8a8c-6f13-418d-bc5e-5ad479c173d1",v:"Anna und Benjamin",n:"Drost"},
  {id:"5a1946df-9572-4a3e-8fa6-2919bff4feb3",v:"Baris",n:"Düz"},
  {id:"ecc273d9-8e48-4259-aace-1cb5ce875997",v:"Ozan",n:"Düz"},
  {id:"cd3bc50f-4c57-468b-9058-06b67800ff6b",v:"Elias Alexander",n:"Ecker"},
  {id:"0ceea36c-5ac3-49ee-bcbd-1ddbccb933dc",v:"Theo",n:"Eichblatt"},
  {id:"226e6ed7-0b5b-4a86-8350-6d2390de1753",v:"Carlos",n:"Enriquez"},
  {id:"532482be-cf2c-4211-b3f5-040aca63a759",v:"Franziska",n:"Erkel"},
  {id:"625ecba9-1162-4afc-9aef-35c787d4e366",v:"Johannes",n:"Falkhofen"},
  {id:"3397bd48-704b-4656-a217-2f8a9ef913ca",v:"Beno",n:"Fehlberg"},
  {id:"c84ef7d2-615f-4791-87ea-a311d6c330eb",v:"Julie",n:"Finkel"},
  {id:"61ad3c39-1c5e-41a0-b931-af773d94399d",v:"Nicolas",n:"Fischer"},
  {id:"2c44ea6b-9a38-4755-85ed-6aa3571b997e",v:"Alessandro",n:"Franco"},
  {id:"f3deaed0-0033-463f-8957-42b25428c9e5",v:"Viola",n:"Gall"},
  {id:"186b51e6-6080-4fa1-93d4-80311d7f3475",v:"Caroline",n:"Geis"},
  {id:"d0946cca-3a0c-4277-ad1c-026ae5cdae02",v:"Jona",n:"Gentzsch"},
  {id:"379b7b39-005f-4f74-b481-e147573528a3",v:"Rouven",n:"Genz"},
  {id:"94b49e9b-d426-4dfa-88fb-742b225a62ce",v:"Artemy",n:"Gerasimov"},
  {id:"b3a0be1d-6a23-4ea8-be0f-636f23a26f41",v:"Alexandra",n:"Ghica"},
  {id:"0d28817a-4580-4141-8cec-d62fe5f8c895",v:"Roman",n:"Goldberg"},
  {id:"2a883f17-f04c-49b6-997f-7f3bae465184",v:"Luisa",n:"Gontarski"},
  {id:"f30eafdd-14a0-4b11-919f-498354c91d70",v:"Hannah",n:"Goyal"},
  {id:"70e6192a-2a79-459c-9ddb-62e479abf95c",v:"Linus",n:"Graeve"},
  {id:"5fbc1502-b8cf-43fe-88be-7fa3e35ed64c",v:"Tim",n:"Graeve"},
  {id:"9af86187-c146-4a3e-83d9-0fae38f1b7eb",v:"Krithi",n:"Gurajada"},
  {id:"2a37b7df-56a7-4758-b114-9acc2ded21ef",v:"Clara",n:"Güttler-Hejma"},
  {id:"2926c3a5-c8e1-4496-9531-938bbc8fb0e8",v:"Karoline",n:"Henkel"},
  {id:"bc1d2740-4aaa-4b7c-af20-9b354be6a468",v:"Matteo",n:"Herzog"},
  {id:"f6abf8d7-78c9-49b3-a29d-5a7f6fd5af15",v:"Christopher",n:"Heyer"},
  {id:"0a08d1a5-7e1b-4c32-9eba-0596f31147c0",v:"Martin",n:"Hikel"},
  {id:"f522b782-5e3d-459a-9e7c-4566a0131dcc",v:"Anke",n:"Hirsch"},
  {id:"10bf87f0-3866-4e14-8798-6438895ebbc7",v:"Daniel",n:"Hirschberg"},
  {id:"8cc33c14-b0f9-4fda-a6fb-38f555cb6ffe",v:"Mirja",n:"Hollmann"},
  {id:"8fce2627-d766-47f0-9c6e-7144c3137c40",v:"Tim",n:"Hölterhoff"},
  {id:"632f3999-d66f-4945-95e2-59e68fe1ea9d",v:"Romy",n:"Hufsky"},
  {id:"dcdc5675-4c33-4057-842b-c016e8183e87",v:"Ranim",n:"Ismail"},
  {id:"f6f1420f-1b83-493d-b235-460674765472",v:"Artur",n:"Ivanenko"},
  {id:"10779c4a-e796-47c2-8495-572ebd14662a",v:"Lukas",n:"Ivanenko"},
  {id:"9a848b95-8460-4949-a8d7-163cd6601cee",v:"Pelle Svante",n:"John"},
  {id:"007e17a9-863d-4546-aa5e-96bfbf8befaf",v:"Philip",n:"Jokic"},
  {id:"99eee3e2-356b-4ae1-aae7-7e89ead5137a",v:"Tobias",n:"Jung"},
  {id:"9395a5af-3d53-4e52-8349-160a1c8cfbdf",v:"Andrea",n:"Kasperbauer"},
  {id:"73d328c0-3087-421d-844a-10a7f13f99be",v:"Felix",n:"Kästner"},
  {id:"e52757fc-8e30-4eba-8c81-dda735e60626",v:"Bruno",n:"Keller-Berk"},
  {id:"9e32c15b-aca4-4085-921c-91dcffa0573a",v:"Peter",n:"Keßler"},
  {id:"ae8c0af2-bb48-40c7-b1fa-344689159a70",v:"Constantin",n:"Kietz"},
  {id:"c5774ed3-f5a7-47e7-86c2-08985b4afcd3",v:"Patrick",n:"Kilborn"},
  {id:"45fdf26e-e386-4558-8dea-182c9961ee9e",v:"Christina",n:"Klasen"},
  {id:"8dcbd679-5138-48a4-bca8-15a4fe041fef",v:"Samy Mahjoub",n:"Klasen"},
  {id:"84ede561-5634-4573-a065-9ad80b710244",v:"Leonie",n:"Klaus"},
  {id:"fc33f056-605b-4af3-ac70-bf7251db2c40",v:"Johanna",n:"Kleinert"},
  {id:"e429bf1f-e9cf-4d8e-a7cf-1993b52ccab6",v:"Isabella",n:"Kleinschmitt"},
  {id:"0c5e8a2f-26e9-47e9-8ee1-cc2ed9e0de1a",v:"Sarah",n:"Knorr"},
  {id:"41a4cf52-c2ff-4864-86f4-b2ef9becd8e4",v:"Timo",n:"Kopitzko"},
  {id:"2abb1a34-9ee2-45b9-b328-f348615889d5",v:"Charlotte",n:"Kreuter"},
  {id:"fc4f8265-8857-44b3-bd84-b54a6a41578f",v:"Maximilian",n:"Kricke"},
  {id:"1caf8593-7c5c-4738-a381-0e4d2ad91990",v:"Timothy",n:"Lalonde"},
  {id:"70a55947-ec52-46aa-8b61-ae8ef2935663",v:"Lennox",n:"Lapp"},
  {id:"c455fdf5-a2ea-4441-bb4e-2e91210b5923",v:"Lilia",n:"Lechea"},
  {id:"dea526b1-ea1f-44ef-94f8-6c466307f083",v:"Nael",n:"Lechea"},
  {id:"05eafce7-e2f3-4f09-9a9a-84e392db02ff",v:"Franz",n:"Lehrer"},
  {id:"bc6afce3-394e-45c1-aab3-9beb88a51347",v:"Agnese",n:"Leotta"},
  {id:"aa2f514a-420b-454c-83d3-f7d08bd0fe29",v:"Tim",n:"Lieder"},
  {id:"c6f3e902-9323-4469-a687-3ab22b0d3111",v:"Maximilian",n:"Linde"},
  {id:"61364965-4ff5-405f-bc83-04e464f4184d",v:"Ansgar",n:"Little"},
  {id:"30f609be-8b48-47ae-9184-fcdf94080493",v:"Liana",n:"Llalloshi"},
  {id:"5a0ed505-cdf6-4d03-847d-472598145fb6",v:"Bastian",n:"Löhrl"},
  {id:"160d19a1-f612-4904-bc05-41a3cdb81cb3",v:"Jana",n:"Lohse"},
  {id:"4d941edf-f0dc-40d6-ab38-6b773f6c1709",v:"Jakob",n:"Lusensky"},
  {id:"1c939f06-116b-4e7e-b615-4ab118b379f7",v:"Antonia",n:"Maaß"},
  {id:"b18cf4d4-1582-4649-bc51-6e262c590e03",v:"Lisa",n:"Malinoswka"},
  {id:"80dfc0fe-af41-4ad0-8051-a51d1e435afb",v:"Max",n:"Mändler"},
  {id:"7a8a5006-5e02-4a2d-bd0f-d0d0b7beb2b6",v:"Charlene",n:"Mathieu"},
  {id:"258d8a1d-9d29-4de8-8aa7-beb0e84931a3",v:"Silvia",n:"Mayr"},
  {id:"4728834b-8efb-4c4b-b79a-f286b0172f1b",v:"Sophie",n:"Misiak"},
  {id:"add7f563-e80c-4507-a823-0c236c9a5823",v:"Carla",n:"Moore"},
  {id:"8e35e6a7-5247-49af-9ba6-335bce81369a",v:"Renke",n:"Müller-Hellmann"},
  {id:"9fc182d7-aee7-4e41-98a2-9ad7e1664e1e",v:"Melanie",n:"Mundhenk"},
  {id:"8520acef-f129-439d-b6df-9ef6c56c38ec",v:"Toma",n:"Nosic"},
  {id:"7ecb1bae-737f-4874-bb3d-d99e0f48ece6",v:"Kristin",n:"Ohle"},
  {id:"e1dbd165-69de-469a-ad8b-ccc18d7e2de6",v:"Philippa",n:"Otto"},
  {id:"ab2f7c2e-f5ab-4f5c-abb6-2b20b40595fd",v:"Vanessa",n:"Otto"},
  {id:"66ed5bbc-d9ca-41f7-af28-4fce32af4e98",v:"Varun",n:"Parasamuran"},
  {id:"cf8d12ae-554c-422f-a8ea-07284f9c8d48",v:"Vedar",n:"Parasamuran"},
  {id:"dd9be073-5cd5-43c1-9582-8157922cbc09",v:"Viktor",n:"Patzak"},
  {id:"934d28fe-3148-41ca-8fab-6685ba954c1a",v:"Jeanne",n:"Payot"},
  {id:"906b4ca2-3aa5-446b-9b08-fa135f80ad9e",v:"Pierre",n:"Payot"},
  {id:"1fd3952d-eff8-4a38-af56-c9a513a33418",v:"Atticus",n:"Pieper"},
  {id:"febd0291-adb1-4e25-a443-1ba7d546c976",v:"Greta",n:"Poliachonok"},
  {id:"1ed26de9-d3ca-4f6f-857e-e9f513b804d5",v:"Vincent",n:"Posner"},
  {id:"bbeef9c5-31d4-475b-bba8-270ec26b8934",v:"Elisa",n:"Puls"},
  {id:"3f625a1d-683d-4ee8-8251-34de650b2333",v:"Onno",n:"Queckenstedt"},
  {id:"8ee941ad-8064-4f9e-8973-5eb9d55e122e",v:"Loki",n:"Radbruch"},
  {id:"549c0d89-34c7-4d24-95f6-d87e33f317b6",v:"Sarah",n:"Radu"},
  {id:"2eefc42f-63c4-4530-a9c5-c7339754efa0",v:"Siddharth",n:"Rangapuram"},
  {id:"5a134b52-36d2-4ca9-a331-8ad4dc882914",v:"Andrin",n:"Reinhart"},
  {id:"cd84efc0-625e-456f-b282-0b7159b906f8",v:"Felix",n:"Remien"},
  {id:"08f8cbf8-bd9e-42fb-acc8-ce72414050f5",v:"Mauro Paradela del",n:"Rio"},
  {id:"b417ff34-bdf6-4782-bfb6-22963ad0446f",v:"Leonore",n:"Ritschl"},
  {id:"09b659c9-5ac5-4d6f-a467-d54e6c2b4187",v:"Celina",n:"Rix"},
  {id:"e8dff0e5-b4e4-4bdf-a7c1-9e02d3b8bcc2",v:"Magda",n:"Rotko"},
  {id:"7dace2ac-af39-423e-8732-d38c0034beb6",v:"Heiko",n:"Ruddigkeit"},
  {id:"1f0681cb-744d-4d83-a98d-cb93cfeaff07",v:"Henri",n:"Ruddigkeit"},
  {id:"ef61a850-592c-47b9-b207-fc1ec070a9d8",v:"Javed",n:"Saleem"},
  {id:"cda51a8e-f860-4f2c-a189-62d90253b016",v:"Noah",n:"Sander"},
  {id:"79f14176-021b-447e-9fe3-c4deae6876e7",v:"Leon",n:"Schaller"},
  {id:"845244d2-614c-4fbf-b06b-4addca403f8a",v:"Tilda",n:"Schliemann"},
  {id:"9feeedef-19b6-48c1-81bb-9dc4de5a74fb",v:"Dinah",n:"Schmechel"},
  {id:"0899ba7c-d07c-4ce6-a4c9-45e28b524231",v:"Antonia",n:"Schmidt"},
  {id:"c15ef470-ed74-42a2-9118-2ec668e7d978",v:"Bethany",n:"Schmidt"},
  {id:"22035bda-a8d4-457b-9f2b-4a2cc705095e",v:"Leonard",n:"Schmidt"},
  {id:"47a3e0b2-4233-4777-b754-c1a71cad9a11",v:"Leon",n:"Schob"},
  {id:"642a0de4-73b0-455c-bb99-4ec067f40c30",v:"Jette",n:"Schönemann"},
  {id:"430bb6c2-91b4-4069-b9e2-2e0bc0e213f2",v:"Jil",n:"Schrader"},
  {id:"9193c4b8-73ee-47a3-aaec-a27f1c5b869d",v:"Augustine",n:"Schubert"},
  {id:"a1b4f376-1b61-4735-a042-de4d1ac01b30",v:"Britta",n:"Schütz"},
  {id:"5773e05e-c359-4db9-b0c0-bf74301fe9d6",v:"Lisa",n:"Shekel"},
  {id:"71a4b7d4-c2b1-4aa0-be10-e03252147ef7",v:"Anja",n:"Siegel"},
  {id:"d3c2c7e8-0ef1-447c-b3cf-508af689378e",v:"Oliver",n:"Simpson"},
  {id:"c403ae8f-ad77-4e01-9f4f-a4e0fb6d860c",v:"Philip",n:"Simpson"},
  {id:"518360f0-5d46-4bdc-aaf4-19c16d88dcee",v:"Alexander",n:"Smarszcz"},
  {id:"02602660-1c5d-4500-9363-b5a5081f3a21",v:"Christin",n:"Sommerfeld"},
  {id:"500e872e-78e1-47fe-a3ef-feaeb075bbdc",v:"Frederik",n:"Soyka"},
  {id:"16f2b349-004f-4ce5-9001-cb0f67c37f9f",v:"Tom",n:"Spenkuch"},
  {id:"ae821255-dc2b-4bc7-8e06-a372c777d814",v:"Hannah",n:"Stadie"},
  {id:"af9eb95e-e7b7-419a-a768-d9c5c8fa3532",v:"Anne",n:"Stadler"},
  {id:"cbf995ea-e5c1-4fe0-b7b9-45f4e79f36e0",v:"Michael",n:"Städler"},
  {id:"63e01f5d-c91f-4b3f-9074-18c809f7c59b",v:"Martin",n:"Staratschek"},
  {id:"9fb0ad15-5182-48ee-987a-dbe32ec765d9",v:"Iosif",n:"Stavarache"},
  {id:"e04da144-d0e2-4b71-9e43-8c08b798ab82",v:"Maria-Alexandra",n:"Steinbeck"},
  {id:"4f13b355-3fbb-40e3-b4ca-04122c4993ae",v:"Zachary",n:"Stoyanov"},
  {id:"590d1ac1-9493-455c-8cb9-e461dee3fc7c",v:"Jördis",n:"Strahlendorff"},
  {id:"67632284-9f83-4282-b2d6-06c39fcda4df",v:"Laura",n:"Strohmeyer"},
  {id:"45a9404c-cdf7-4eb9-bd64-650048e5547e",v:"Marvin",n:"Stutz"},
  {id:"5c8ec220-20a2-4d38-85e9-4fdfeeead1bf",v:"Adam",n:"Tabka"},
  {id:"99d9ecc8-9a6c-4bf8-8623-69852ae7ee00",v:"Kira",n:"Taige"},
  {id:"79682347-851f-44b5-9c07-881186801495",v:"Ammar",n:"Teibi"},
  {id:"115b629a-9ad2-4082-9a5c-dbc37ede9b3f",v:"Elias",n:"Telagh"},
  {id:"8f686b70-1345-4319-b8ac-c043ca9c3316",v:"Lukas",n:"Torliene"},
  {id:"ffdc1940-dc09-4e8c-9c63-1604e88fd8c7",v:"Julius",n:"Trunk"},
  {id:"b940ac21-ac29-4d63-aac1-ded3a2dc2c09",v:"Pascal",n:"Urich"},
  {id:"56063fd8-72bb-4b3b-be92-e7d073b7d466",v:"Lukas",n:"Vanauer"},
  {id:"dacc7f00-70ae-439e-af37-c5cd1f2a437b",v:"Meike",n:"Verführth"},
  {id:"3586ce28-0b09-4670-8aed-e4706ad964ab",v:"Konrad",n:"Vogt"},
  {id:"7717efb9-6f31-4839-a0d8-793d2172ae17",v:"Robert",n:"Vogt"},
  {id:"c85d3235-c52b-41fc-b958-82c7024935c5",v:"Isabella",n:"Voit"},
  {id:"2ac9cef6-a222-48d0-98bb-24b263e23b62",v:"Raphael",n:"Voit"},
  {id:"895dd980-2837-40ee-9896-28063f85ea39",v:"Lena",n:"von Stebut"},
  {id:"022cbed8-5fb3-4b6a-9e44-4c3950dafebe",v:"Magdalena",n:"Vondung"},
  {id:"d11d02b1-53ce-483c-b0e5-1eae07d1c81a",v:"Elisabeth",n:"Vorst"},
  {id:"a20ce8c6-0ccb-4237-8e54-6f146414a897",v:"Anna",n:"Wanderwitz"},
  {id:"f077d099-6b18-431d-9569-9268da67b139",v:"Ramona",n:"Weber"},
  {id:"4905ab0c-6c03-4d0f-a0a8-2711d782bacf",v:"Jannik",n:"Weiße"},
  {id:"28d182f7-d035-4056-afe3-34312d2158ab",v:"Mara",n:"Wengel"},
  {id:"36abf79e-09ec-4f02-acb3-f2a80991b1b7",v:"Rene",n:"Wildbrett"},
  {id:"d187a1dc-6073-4d73-92f2-e05d606e2807",v:"Julia",n:"Witt"},
  {id:"39fad957-886c-4801-b7a9-1941207a6fb9",v:"Julia",n:"Wittig"},
  {id:"1ca40fd9-1509-4a47-8f35-f8b929cb4187",v:"Aziz",n:"Yilmaz"},
  {id:"45529cc6-1399-4c8c-b316-dc34e3479d28",v:"Jakob",n:"Zeiler"},
];

// ---- Manuelle Mappings: CSV-Name → Spieler-Lookup ----
// Format: { ids: ["uuid", ...] } für 1 oder mehr Spieler, oder null (= ignorieren)
const MANUAL = {
  "alexander und stefanie greeve": null,
  "alexandra keller-berk": { ids: ["e52757fc-8e30-4eba-8c81-dda735e60626"] }, // Bruno Keller-Berk
  "andrew close": { ids: ["38172ca6-b94c-4c61-8239-11f982ee9ada"] }, // Alessandro Close
  "annika kuhlmann": null,
  "audrey mathieu": { ids: ["7a8a5006-5e02-4a2d-bd0f-d0d0b7beb2b6"] }, // Charlene Mathieu
  "ava van vliet": null,
  "bärbel ruck": null,
  "belisario de azevedo": { ids: ["e445c33f-6192-4fa5-942a-25a68b6233ce"] }, // Simon de Azevedo
  "breno mingues reinert": null, // user: egal
  "camille everaert": null,
  "carla luths": null, // user: egal
  "carmelo leotta": { ids: ["bc6afce3-394e-45c1-aab3-9beb88a51347"] }, // Agnese Leotta
  "carolin geis": { ids: ["186b51e6-6080-4fa1-93d4-80311d7f3475"] }, // Caroline Geis
  "carsten hirschberg": { ids: ["10bf87f0-3866-4e14-8798-6438895ebbc7"] }, // Daniel Hirschberg
  "cathleen herzog": { ids: ["bc1d2740-4aaa-4b7c-af20-9b354be6a468"] }, // Matteo Herzog
  "charlotte kehl": null,
  "chloe payot": null, // user: egal
  "christian schliemann-radbruch": { ids: ["845244d2-614c-4fbf-b06b-4addca403f8a","8ee941ad-8064-4f9e-8973-5eb9d55e122e"] }, // Tilda Schliemann + Loki Radbruch
  "christine farrar": { ids: ["c83d6e9c-2161-482c-b28a-d8f8d75230f5"] }, // Raphael Bayer
  "dennis stadie": { ids: ["ae821255-dc2b-4bc7-8e06-a372c777d814"] }, // Hannah Stadie
  "diana röpke": null,
  "dominika blaszczyk": { ids: ["ef2887c7-3125-4344-b4b2-8bacfd4b8e72"] }, // Igor Blaszczyk
  "dumitru vasilica-lulian": null,
  "eduard zeiler": { ids: ["45529cc6-1399-4c8c-b316-dc34e3479d28"] }, // Jakob Zeiler
  "ewa karaskiewicz": null,
  "felix schmidt": { ids: ["22035bda-a8d4-457b-9f2b-4a2cc705095e"] }, // Leonard Schmidt
  "florian dohmann": null,
  "florian soyka": { ids: ["500e872e-78e1-47fe-a3ef-feaeb075bbdc"] }, // Frederik Soyka
  "fritz finne": null,
  "gesine niedobitek": null,
  "giulio baraldi": null,
  "hamit yilmaz": { ids: ["1ca40fd9-1509-4a47-8f35-f8b929cb4187"] }, // Aziz Yilmaz
  "hans christian müller-dröge": null,
  "hariharan parasuraman": { ids: ["66ed5bbc-d9ca-41f7-af28-4fce32af4e98","cf8d12ae-554c-422f-a8ea-07284f9c8d48"] }, // Varun + Vedar Parasamuran
  "heike abromeit": null, // user: Tatjana ist die richtige
  "helena pietsch": null,
  "henriette schönemann": { ids: ["642a0de4-73b0-455c-bb99-4ec067f40c30"] }, // Jette Schönemann
  "ina thimm": null,
  "izabela dabrowska-diemert": { ids: ["6325cba8-9684-4177-a614-db2f97cbdbf9"] }, // Rosa Dabrowska
  "jeanette kunsmann": null,
  "jon vrushi": null,
  "julia fehlberg": { ids: ["3397bd48-704b-4656-a217-2f8a9ef913ca"] }, // Beno Fehlberg
  "juliane eichblatt": { ids: ["0ceea36c-5ac3-49ee-bcbd-1ddbccb933dc"] }, // Theo Eichblatt
  "kameliya stoyanova": { ids: ["4f13b355-3fbb-40e3-b4ca-04122c4993ae"] }, // Zachary Stoyanov
  "karen beecken": { ids: ["e599f523-1f31-430e-822f-cc9b6783eeee"] }, // Maite Beecken
  "karoline große": null,
  "krasina pavlova": null,
  "lars eberle": null,
  "laura bock": { ids: ["9e68dc9e-d155-4914-9dde-b4141ffade95"] }, // Laura Block (Tippfehler)
  "lea gregor": null,
  "leila saidalijeva": { ids: ["e04da144-d0e2-4b71-9e43-8c08b798ab82"] }, // Maria-Alexandra Steinbeck (Mama)
  "lenz queckenstedt": { ids: ["3f625a1d-683d-4ee8-8251-34de650b2333"] }, // Onno Queckenstedt
  "liya wang": null,
  "manfred lapp": { ids: ["70a55947-ec52-46aa-8b61-ae8ef2935663"] }, // Lennox Lapp
  "maria poliachonok": { ids: ["febd0291-adb1-4e25-a443-1ba7d546c976"] }, // Greta Poliachonok
  "marina georgescu": null,
  "martin horst staratschek": { ids: ["63e01f5d-c91f-4b3f-9074-18c809f7c59b"] }, // Martin Staratschek
  "matthias misiewicz": null,
  "max maendler": { ids: ["80dfc0fe-af41-4ad0-8051-a51d1e435afb"] }, // Max Mändler
  "michael dufner": null,
  "michael gaebler": null,
  "miura maki": null,
  "nadja voit": { ids: ["2ac9cef6-a222-48d0-98bb-24b263e23b62","c85d3235-c52b-41fc-b958-82c7024935c5"] }, // Raphael + Isabella Voit
  "nelya smarszcz": { ids: ["518360f0-5d46-4bdc-aaf4-19c16d88dcee"] }, // Alexander Smarszcz
  "nico schlenker": null,
  "oliver vogt und sabine drexler": { ids: ["7717efb9-6f31-4839-a0d8-793d2172ae17","3586ce28-0b09-4670-8aed-e4706ad964ab"] }, // Robert + Konrad Vogt
  "olivia hertel": null,
  "omar sidelkheir": null,
  "parvaneh mojibi": null,
  "pelle john": { ids: ["9a848b95-8460-4949-a8d7-163cd6601cee"] }, // Pelle Svante John
  "pieter overgoor": null,
  "rosemary bobby": null,
  "rune koehn": null,
  "said nezirovic": null,
  "saide asyemez düz": { ids: ["5a1946df-9572-4a3e-8fa6-2919bff4feb3","ecc273d9-8e48-4259-aace-1cb5ce875997"] }, // Baris + Ozan Düz
  "samuel bolon": null,
  "sandra verfürth": { ids: ["dacc7f00-70ae-439e-af37-c5cd1f2a437b"] }, // Meike Verführth
  "sarah valerie radu": { ids: ["549c0d89-34c7-4d24-95f6-d87e33f317b6"] }, // Sarah Radu
  "sebastian maaß": { ids: ["1c939f06-116b-4e7e-b615-4ab118b379f7"] }, // Antonia Maaß
  "seher aksoy": null,
  "shinta sander": { ids: ["cda51a8e-f860-4f2c-a189-62d90253b016"] }, // Noah Sander
  "slim tabka": { ids: ["5c8ec220-20a2-4d38-85e9-4fdfeeead1bf"] }, // Adam Tabka
  "soley daro gerard": null,
  "stefanie kietz": { ids: ["ae8c0af2-bb48-40c7-b1fa-344689159a70"] }, // Constantin Kietz
  "steffen schaller": { ids: ["79f14176-021b-447e-9fe3-c4deae6876e7"] }, // Leon Schaller
  "subramanyam gurajada": { ids: ["9af86187-c146-4a3e-83d9-0fae38f1b7eb"] }, // Krithi Gurajada
  "susann schimk": null,
  "suzana llalloshi": { ids: ["30f609be-8b48-47ae-9184-fcdf94080493"] }, // Liana Llalloshi
  "syama sundar yadav rangapuram": { ids: ["2eefc42f-63c4-4530-a9c5-c7339754efa0"] }, // Siddharth Rangapuram
  "tatjana abromeit": { ids: ["28c13f44-ef89-40f2-bd59-41dd3af36228"] }, // Juna Abromeit
  "torben krause": null,
  "verena lüsing": null,
  "volker schoenert": null,
  "warod alsaif": null,
  "wojtanowicz bartlomiey": { ids: ["2b66dd6b-6bf3-454f-bb23-b190afb8ad5c"] }, // Anthony Bartlomiey
};

function lc(s){return (s||"").toLowerCase().normalize("NFC").replace(/\s+/g," ").trim();}
function spielerByName(v,n){
  const tv=lc(v), tn=lc(n);
  return SPIELER.find(s => lc(s.v)===tv && lc(s.n)===tn);
}
function spielerByLastName(n){
  const tn=lc(n);
  return SPIELER.filter(s => lc(s.n)===tn);
}

// ---- CSV parsen ----
const csvText = fs.readFileSync(path.resolve(__dirname,"..","..","Desktop","contactBook.csv"),"utf-8");
const rows = csvText.split(/\r?\n/).filter(l=>l.trim()).map(l=>l.split(";"));
const header = rows[0];
const data = rows.slice(1);

const matched = [];
const conflicts = [];
const unmatched = [];

for (const cols of data) {
  const name = (cols[0]||"").trim();
  const iban = (cols[1]||"").replace(/\s/g,"").trim();
  const bank = (cols[2]||"").trim();
  const verwendung = (cols[5]||"").trim();
  const mandat = (cols[6]||"").replace(/[,\s]+$/,"").trim();
  const datum = (cols[7]||"").trim();
  if (!name) continue;

  const tokens = name.split(/\s+/);
  const vor = tokens.slice(0,-1).join(" ");
  const nach = tokens[tokens.length-1];
  const lcname = lc(name);

  let targets = [];
  let reason = "";

  // 1) Manuelles Mapping (1..n Spieler)
  if (lcname in MANUAL) {
    if (MANUAL[lcname] === null) {
      unmatched.push({csvName:name,iban,mandat,datum,bank,verwendung,reason:"manuell ignoriert / kein Spieler"});
      continue;
    }
    if (Array.isArray(MANUAL[lcname].ids)) {
      targets = MANUAL[lcname].ids.map(id => SPIELER.find(s=>s.id===id)).filter(Boolean);
      reason = targets.length > 1 ? "manuell zugeordnet (split)" : "manuell zugeordnet";
    }
  }

  // 2) Direkter Match
  if (!targets.length) {
    const t = spielerByName(vor, nach);
    if (t) { targets = [t]; reason = "exakt (vor+nach)"; }
  }

  // 3) Nachname-Match
  if (!targets.length) {
    const candidates = spielerByLastName(nach);
    if (candidates.length === 1) {
      targets = [candidates[0]];
      reason = "nachname-eindeutig";
    } else if (candidates.length > 1) {
      conflicts.push({csvName:name,iban,mandat,datum,bank,verwendung,reason:`mehrere Spieler mit Nachname '${nach}'`,candidates:candidates.map(c=>`${c.v} ${c.n}`)});
      continue;
    }
  }

  if (targets.length) {
    for (const t of targets) {
      matched.push({
        spielerId:t.id,
        spielerName:`${t.v} ${t.n}`,
        csvName:name,
        iban,
        mandat,
        datum,
        bank,
        verwendung,
        reason
      });
    }
  } else {
    unmatched.push({csvName:name,iban,mandat,datum,bank,verwendung,reason:"kein Match"});
  }
}

// ---- Ergebnisse ----
console.log(`\n=== MATCHED (${matched.length}) ===`);
for (const m of matched) console.log(`✓ ${m.csvName.padEnd(38)} → ${m.spielerName.padEnd(38)} [${m.reason}]`);

console.log(`\n=== KONFLIKTE (${conflicts.length}) ===`);
for (const c of conflicts) console.log(`⚠ ${c.csvName} → ${c.reason} (${c.candidates.join(", ")})`);

console.log(`\n=== UNMATCHED (${unmatched.length}) ===`);
for (const u of unmatched) console.log(`✗ ${u.csvName.padEnd(38)} [${u.reason}]`);

// ---- Neue CSV schreiben (Format: Name;IBAN;Bankname;Adresse;Glaubiger-ID;Verwendungszweck;Mandatsreferenz;Unterschriftsdatum;Zusatzinformation;) ----
// Name = Spieler-Name (vor+nach), nicht der CSV-Name
const out = ["Name;IBAN;Bankname;Adresse;Glaubiger-ID;Verwendungszweck;Mandatsreferenz;Unterschriftsdatum;Zusatzinformation;"];
for (const m of matched) {
  const verwUnified = "Abbuchung Tennistraining (Monat), Rechnung nur auf Anfrage";
  const zusatz = m.csvName !== m.spielerName ? `Rechnungsempfänger: ${m.csvName}` : "";
  out.push([m.spielerName, m.iban, m.bank, "", "DE58ZZZ00002765947", verwUnified, m.mandat, m.datum, zusatz, ""].join(";"));
}
fs.writeFileSync(path.resolve(__dirname,"..","..","Desktop","contactBook_matched.csv"), out.join("\n")+"\n", "utf-8");

console.log(`\n→ neue CSV: C:\\Users\\artur\\Desktop\\contactBook_matched.csv`);
console.log(`   ${matched.length} Zeilen geschrieben`);
