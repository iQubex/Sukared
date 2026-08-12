# SukaRed 1.0 Proje Devir ve İlerleme Raporu

Rapor tarihi: 16 Temmuz 2026  
Repository: `C:\Users\missk\Desktop\Important\Obfuscator`  
Kanıt kaynakları: çalışan kod, repository testleri, üretilmiş test raporları ve bu rapor hazırlanırken yeniden çalıştırılan testler.

> Not: Kod tabanında yalnızca Phase 1-4 isimleri açık biçimde kullanılıyor. Phase 4 sonrasındaki başlıklar, dosya ve test gruplarından yeniden oluşturulmuş geliştirme etaplarıdır; resmi Phase numaraları **belirsizdir**.

# 1. Proje özeti

SukaRed 1.0, Lua/Luau kaynak kodunda tersine mühendislik maliyetini artırmak için AST dönüşümleri, sabit/string koruması ve fonksiyon seviyesinde gerçek VM virtualization uygulayan Node.js tabanlı bir obfuscator servisidir. Sistem “kırılamazlık” garantisi vermez. Ana hedef davranışı korurken okunabilirliği, statik analiz kolaylığını ve build'ler arası yapısal benzerliği azaltmaktır.

Desteklenen ortamlar:

- Kaynak dil: Lua ve Roblox Luau'nun preprocessor tarafından desteklenen alt kümesi.
- Sunucu: Node.js, Express, worker tabanlı build havuzu.
- Doğrulama runtime'ı: öncelikle yerel/native Luau CLI `0.729`, fallback olarak `luau-web 1.4.0`.
- Hedef ekosistem: Roblox/Luau scriptleri ve kontrollü executor API passthrough senaryoları.
- Roblox engine davranışı gerçek Roblox istemcisinde değil, testlerde kontrollü mock'larla doğrulanıyor.

Ana mimari modülerdir. `server.js` public profil eşlemesini, servis limitlerini ve `/obfuscate` endpoint'ini yönetir. `core/preprocessor.js` Luau uyumluluk dönüşümlerini yapar. `core/vm/*` fonksiyon keşfi, uyumluluk, seçim, AST -> IR -> bytecode, opcode/layout üretimi, interpreter ve metadata üretimini yürütür. VM dışı dönüşümler `core/ast_traverser.js`, dead-code ve minifier modüllerindedir. Frontend bağımsız bir History API SPA'dır.

Production pipeline'ın güncel sırası:

1. Public profil doğrulama ve internal profile eşleme.
2. Luau preprocess.
3. AST parse, scope/candidate analizi ve VM seçim politikası.
4. Seçilen fonksiyonları IR ve custom bytecode'a derleme.
5. Orijinal function body'lerini VM wrapper'larıyla değiştirme.
6. Interpreter, bytecode, constant pool ve VM metadata üretme.
7. Dead-code enjeksiyonu.
8. VM uygulanmadıysa normal AST/string/number dönüşümleri; VM runtime üretildiyse VM çıktısını bozabilecek post-transform'lar atlanır.
9. Decoder runtime ekleme, Luau minification ve output validation.
10. Worker/service limitleri ve API response metadata.

VM'nin görevi tüm scripti payload olarak `loadstring` ile çalıştırmak değildir. Uygun function body'leri kaldırılır, register tabanlı instruction dizilerine çevrilir ve generated interpreter tarafından çalıştırılır.

# 2. Profil sistemi

| Profil | Uygulama durumu | Site durumu | VM | Seçim politikası | Koruma katmanları | Açılma durumu |
| --- | --- | --- | --- | --- | --- | --- |
| Light | Tam uygulanmış | Available | Kapalı | 0 | Shift/byte string, en küçük çıktı, dead code/integrity/number hiding kapalı | Hazır |
| Light+ | Tam uygulanmış | Available | Kapalı | 0 | Shift/byte/XOR, düşük dead code, integrity ve number hiding, hafif AST dönüşümleri | Hazır |
| Good | Tam uygulanmış ve önerilen | Available/Recommended | Selective | min 24, hedef %20, max 180 | Güvenli decoder ailesi, budgeted VM, fallback, menu/event önceliği | Hazır |
| Pro | Uygulanmış | Available | Aggressive | min 64, hedef %40, max 400 | Daha geniş koruma bütçeleri ve yüksek uygun-fonksiyon kapsaması | Gelişmiş profil; Good önerilen profil olarak kalır |
| Hell | Kısmen uygulanmış | Unavailable | Hybrid/clustered test modu | min 128, hedef %65, max 800 | Shared clusters, segmented pools, fused/split opcodes, CFG/dispatch çeşitlendirme, nested prototype clustering | Hazır değil |
| Blatant | Yalnızca profil politikası/placeholder | Unavailable | Uygulanmış public hat yok | min 256, hedef %85, max 1600 | Ayrı ve doğrulanmış ürün katmanları **belirsiz** | Hazır değil |
| Fatality | Yalnızca profil politikası/placeholder | Unavailable | Uygulanmış public hat yok | hedef %100, teknik cap 5000 | Ayrı ve doğrulanmış ürün katmanları **belirsiz** | Hazır değil |

Profil ayrıntıları:

- **Light:** Kasıtlı olarak VM kullanmaz; geniş uyumluluk ve küçük çıktı önceliklidir. Eksik katman VM'dir, ancak bu profil sözleşmesine uygundur. Güncel kabul matrisinde bilinen semantic hata yoktur.
- **Light+:** VM kullanmaz; Light'tan daha fazla AST/string/number koruması uygular. Büyük scriptte output ve runtime maliyeti Light'tan yüksek olabilir; public matriste 1000-function fixture için 2.16x maksimum slowdown görülmüştür. Bilinen semantic mismatch yoktur.
- **Good:** VM-uygun fonksiyonları seçer; desteklenmeyen veya bütçeyi aşan fonksiyonları geçerli normal Luau olarak bırakır. Fonksiyonsuz geçerli scriptler hata değildir. Eksik yönü universal VM coverage olmamasıdır; bu safe fallback ile açıkça raporlanır. Güncel regression'larda doğrulanmış semantic hata yoktur.
- **Pro:** Daha yüksek oran ve maliyet bütçesiyle çalışır ve `Available` durumundadır. Good, performans ve uyumluluk dengesi nedeniyle önerilen profil olarak kalır. Güncel tam regresyon zincirinde doğrulanmış semantic hata yoktur.
- **Hell:** Production bileşenlerine ve test endpoint override'ına sahiptir, fakat `HELL_ENABLED=false` ve normal sitede seçilemez. Eksikleri semantic-recovery eşikleri ve tam acceptance matrisidir. Bilinen blocker oranları opcode `0.125`, constant/control-flow/call `1.0`'dır.
- **Blatant:** Merkezi %85 seçim policy'si ve kilitli UI kartı dışında ayrı bir public implementation/acceptance contract yoktur. Eksik özelliklerin kapsamı ve profile özel VM farkı **belirsizdir**. Kullanıma hazır değildir.
- **Fatality:** Merkezi %100 policy ve teknik safety cap dışında ayrı bir public implementation/acceptance contract yoktur. Eksik özelliklerin kapsamı **belirsizdir**. Kullanıma hazır değildir.

Şu anda kullanıcılara açık en yüksek profil: **Pro (Available)**.  
Önerilen stabil profil: **Good**.  
Geliştirilmekte olan profil: **Hell**.  
Bir sonraki aktivasyon hedefi: **Hell Experimental**.  
Hell açılmadan önce semantic recovery eşikleri, tam seed/scale acceptance matrisi, bütçe doğrulaması ve güvenli operasyon kapıları tamamlanmalıdır.

# 3. Phase ilerlemesi

## Phase 0 - AST/Luau temel hattı (resmi numara belirsiz)

- Amaç: Luau preprocess, parser, AST generator, string/number dönüşümleri, minification ve output validation.
- Durum: Büyük ölçüde tamamlandı.
- Dosyalar: `core/preprocessor.js`, `core/ast_traverser.js`, `core/luau_minifier.js`, `utils/*`.
- Testler: `test_obfuscator.js`, parser/runtime regression fixture'ları.
- Eksik: Tüm Luau grammar'ı için resmi parser garantisi yok; typed Luau yalnızca test edilen alt kümede destekleniyor.
- Bağlantı: VM seçiminden önce geçerli ve konumları korunmuş AST sağlaması gerekir.

## Phase 1 - Gerçek function-level VM

- Amaç: Seçilen local function body'lerini AST -> IR -> bytecode hattına almak.
- Durum: Tamamlandı.
- Temel opcodes: `LOAD_CONST`, `MOVE`, `GET_GLOBAL`, `ADD`, `SUB`, `MUL`, `DIV`, `CALL`, `RETURN`.
- Dosyalar: `core/vm/ir.js`, `compiler.js`, `instruction_encoder.js`, `interpreter_generator.js`, `virtualizer.js`.
- Kanıt: `test_vm.js` Phase 1 ve production `/obfuscate` testleri; original body absence ve real runtime execution.
- Sonraki bağlantı: Table/member/call semantiği Phase 2'de genişletildi.

## Phase 2 - Tables, member/self, vararg ve multi-return

- Amaç: Gerçek Roblox scriptlerinde gerekli veri erişimi ve call semantiğini VM'e eklemek.
- Durum: Tamamlandı.
- Özellikler: `NEW_TABLE`, `GET_TABLE`, `SET_TABLE`, `SELF`, nil/bool, normal ve method call, vararg forwarding, multiple CALL/RETURN sonuçları.
- Dosyalar: `compiler.js`, `compatibility.js`, interpreter/encoder modülleri.
- Testler: table ops, receiver'ın bir kez değerlendirilmesi, multiple results, vararg forwarding, method declarations.
- Eksik: Compatibility listesinin dışındaki expression/statement türleri fallback kullanır.

## Phase 3 - Control-flow ve loop execution

- Amaç: If, while, repeat, numeric/generic for ve break'i gerçek VM instruction akışına çevirmek.
- Durum: Tamamlandı.
- Opcodes: `JUMP`, `JUMP_IF`, `FOR_PREP`, `FOR_LOOP`, `ITER_PREP`, `ITER_NEXT`.
- Dosyalar: `compiler.js`, `block_shuffler.js`, `cfg_mutator.js`, interpreter.
- Testler: Production endpoint Phase 3 testi, nested return/loop fixture'ları.
- Eksik: `DoStatement` compatibility checker tarafından hâlâ unsupported kabul ediliyor.

## Phase 4 - Closure semantics ve nested prototypes

- Amaç: Anonymous/nested functions, lexical cells, recursive upvalues ve loop iteration capture davranışını korumak.
- Durum: Tamamlandı ve regression testli.
- Özellikler: `CLOSURE`, `GET_UPVALUE`, `SET_UPVALUE`, `RESET_CELL`; sibling mutation, recursive/mutual recursion, numeric/generic loop iteration cells.
- Dosyalar: `compiler.js`, `function_selector.js`, interpreter ve cluster generator.
- Testler: `closure-loop-semantics.lua`, nested pcall callback, returned/table closures, method callbacks.
- Eksik: Coroutine/yield sınırları her zaman shared cluster'a alınmaz; dedicated veya normal fallback gerekebilir.

## Phase 5 - Profile coverage ve production reporting (resmi numara belirsiz)

- Amaç: Good/Pro ayrımı, safe fallback, metadata invariants, non-local method declarations ve production endpoint integration.
- Durum: Tamamlandı.
- Dosyalar: `server.js`, `metrics.js`, `function_selector.js`, `output_validator.js`.
- Testler: Good/Pro budget, real route, metadata consistency, member methods, mega fixture.
- Bağlantı: Ölçeklenebilir seçim ve public beta kapılarını mümkün kıldı.

## Phase 6 - Hell preparation/hybrid runtime (resmi numara belirsiz)

- Amaç: Shared interpreter cluster, cross-function constant pool segmentation, operand encoding, fused/split opcodes ve nested prototype clustering.
- Durum: Fonksiyonel fakat profile activation tamamlanmadı.
- Dosyalar: `cluster_generator.js`, `dispatch_generator.js`, `cfg_mutator.js`, `instruction_mutator.js`, `hell_preparation.js`.
- Testler: `test_hell.js`, `test_hell_preparation.js`, fused-opcode ve hybrid-runtime fixture'ları.
- Güncel test: 10 virtualized, 9 clustered, 1 dedicated, 4 shared cluster, 18 fused, 8 split, 24 shuffled block.

## Phase 7 - Hell anti-analysis/adversarial recovery (resmi numara belirsiz)

- Amaç: Build fingerprint çeşitliliğini ve semantic recovery maliyetini ölçmek.
- Durum: Kısmen tamamlandı; aktivasyon blocker'ları var.
- Dosyalar: `semantic_recovery_analyzer.js`, `adversarial_analyzer.js`, `hell_preparation.js`.
- Test: 100/100 unique fingerprints, normalized similarity `0.01`, executable recovery `0`.
- Eksik: opcode semantic recovery `0.125`; constant, control-flow ve call semantic recovery oranları `1.0`.

## Phase 8 - Scalable profile selection ve menu/dispatcher protection (son çalışma)

- Amaç: Sabit 24/64 limitini script boyutuna göre ölçeklemek ve UI kontrol akışını öncelikli korumak.
- Durum: Tamamlandı; ana regression kapısına bağlandı.
- Dosyalar: `profile_policies.js`, `function_classifier.js`, `function_selector.js`, `menu_constant_protector.js`, `metrics.js`, `virtualizer.js`, `server.js`.
- Test: 10/40/100/800/2000 scaling, seed determinism, 8-region fairness, budget enforcement ve real Luau menu differential test.

# 4. Yüzdelik ilerleme

Bu oranlar ürün bileşenleri ağırlıklandırılarak hazırlanmış mühendislik tahminidir; test pass yüzdesi değildir.

- Pro profili: **Available**. Ana VM, closure/control-flow, aggressive budget, native runtime ve tam regresyon zinciri doğrulandı. Good, daha düşük maliyeti nedeniyle önerilen profil olarak kalır.
- Hedef Hell profili: **%65**. Hybrid runtime ve çeşitlendirme çalışıyor; semantic recovery eşikleri, full seed/scale acceptance ve public operational gate geçilmedi.
- SukaRed v1.0 bütünü: **%82**. Kontrollü beta çekirdeği hazır; production account/credit provider, güvenli arbitrary Roblox runtime sandbox ve üst profiller eksik.
- VM sistemi: **%86**. Register VM, loops, closures, methods, varargs, clustering ve validation mevcut; tüm AST türleri ve yield sınırları için universal VM coverage yok.
- Menü/callback koruması: **%85**. Generic AST tespiti, mandatory priority, label protection, static registry ID remap ve dispatcher VM mevcut; tamamen dinamik/custom UI registry'leri güvenli fallback kullanıyor.
- Test altyapısı: **%88**. Native/web harness, differential, stress, fuzz, adversarial ve service testleri güçlü. Yeni scaling sonrası tam public-beta/2000 runtime acceptance yeniden üretilmeli.
- Site/beta sistemi: **%80**. Multi-page SPA, settings, local history, privacy defaults ve backend API hazır. Authentication, cloud history, production credits/payment ve cancellation endpoint yok.

# 5. Son yapılan çalışma

Değiştirilen/eklenen başlıca dosyalar:

- `Backend/core/vm/profile_policies.js`: merkezi profile ratio ve bütçeleri.
- `Backend/core/vm/function_classifier.js`: menu/event/dispatcher/entrypoint/cost sinyalleri.
- `Backend/core/vm/function_selector.js`: deterministic seeded, cost-aware, region-fair seçim.
- `Backend/core/vm/menu_constant_protector.js`: menu label koruması ve güvenli static feature-ID remap.
- `Backend/core/vm/metrics.js`, `virtualizer.js`, `Backend/server.js`: privacy-safe metadata.
- `Backend/core/vm/instruction_mutator.js`: split-opcode regression stabilizasyonu.
- `Backend/test_vm_selection_scaling.js`: yeni scaling/menu/runtime suite.
- `Backend/package.json`: yeni suite ana `test:regressions` zincirine eklendi.
- `Backend/VM_SELECTION_SCALING.md`: politika ve sınır dokümantasyonu.

Yeni algoritma önce bütün adayları keşfeder; trivial wrapper'ları ratio denominator'ından çıkarır, fakat küçük menu/event/dispatcher adaylarını mandatory tutar. Her adaya node, instruction, branch, loop, closure, upvalue ve nested function tabanlı maliyet; menu/event/dispatcher, call graph, sensitive constants ve entrypoint tabanlı koruma puanı verir. Mandatory core, graph komşuları ve yüksek value/cost adayları kaynakta sekiz bölgeye round-robin dağıtılır. Instruction, output, complexity, time ve interpreter bütçeleri aşılmaz. Aynı seed aynı seçimi üretir; düşük/orta adaylar farklı seed'de kontrollü değişir.

Güncel scaling sonucu:

| Fonksiyon | Good | Pro |
| ---: | ---: | ---: |
| 10 | 10 (%100) | 10 (%100) |
| 40 | 24 (%60) | 40 (%100) |
| 100 | 24 (%24) | 64 (%64) |
| 800 | 160 (%20), cost 3520 | 320 (%40), cost 7040 |
| 2000 | 180 (%9, cap) | 400 (%20, cap) |

800 fonksiyonluk production/runtime oturum ölçümünde Good 160 fonksiyon, yaklaşık 820 KB output, yaklaşık 6.0 s build ve 145 ms runtime; Pro 320 fonksiyon, yaklaşık 1.51 MB output, yaklaşık 16.5 s build ve 214 ms runtime verdi. Bu ölçüm terminal oturumundan gelmektedir; repository içinde kalıcı benchmark JSON'u olarak saklanmamıştır.

Menu fixture sonucu: 2/2 menu callback, 1/1 event handler ve 1/1 dispatcher virtualized; iki feature ID remap edildi, iki label korundu ve original/generated runtime çıktıları `16` olarak eşleşti.

# 6. Mevcut VM durumu

VM'e alınabilen ana yapılar:

- Local, anonymous ve desteklenen non-local `T.method` / `T:Method` function declarations.
- Number/string/bool/nil constants, globals, locals, tables, member/index access.
- Arithmetic `+ - * /`, concat `..`, comparisons, `and/or`, `not/#/-`.
- Normal call, method call ve receiver-once `SELF` semantiği.
- If, while, repeat, numeric/generic for ve break.
- Nested/returned/table-stored callbacks, pcall/task/event callback biçimleri.
- Closures, transitive upvalues, sibling shared cells, recursion/mutual recursion.
- Varargs, nil dahil multiple call/return değerleri.

VM'e alınamayan veya koşullu kalan yapılar:

- `DoStatement` ve compatibility whitelist dışında kalan statement/expression türleri.
- Profilin `maxNodesPerFunction` sınırını aşan çok büyük tek fonksiyonlar.
- Desteklenmeyen parameter/declaration target biçimleri.
- Bazı coroutine/yield sınırları shared clustering yerine dedicated interpreter veya normal fallback kullanır.
- Tam Luau type grammar, interpolated-string AST varyantlarının tamamı ve yeni Luau syntax sürümleri için universal garanti yoktur.
- Executor API'leri VM tarafından emüle edilmez; target runtime global olarak sağlamalıdır.

Anonymous callback, nested function, closure/upvalue, vararg ve multiple return desteği vardır. Menu callback/event/dispatcher adayları mandatory öncelik alır. Event callback parametreleri ve method `self` regression testlidir. Good/Pro artık sabit ilk-N seçmez; minimum + ratio + maximum ile instruction/bytecode/complexity bütçelerini birlikte kullanır.

# 7. Test sonuçları

Bu rapor hazırlanırken başarıyla çalıştırılan benzersiz suite'ler:

1. `test_obfuscator.js`
2. `test_vm.js`
3. `test_vm_selection_scaling.js`
4. `test_adversarial.js`
5. `test_hell_preparation.js`
6. `test_service_hardening.js`
7. `test_hell.js`
8. `test_semantic_audit.js`
9. `test_runtime_harness.js`
10. `test_hell_adversarial.js`

Son durum: **10 suite başarılı, 0 kalıcı başarısız, atlanan test sayısı raporlanmıyor/belirsiz**. Runtime harness ilk kez Hell testiyle paralel başlatıldığında başka testin geçici klasörünü görüp bir kez düştü; tek başına yeniden çalıştırıldığında cleanup kontrolü geçti. Bu, test suite'lerinin aynı temp prefix ile paralel çalıştırılmaması gerektiğini gösteren düşük öncelikli bir test izolasyonu riskidir.

Test edilen özellikler: parser/preprocessor, arithmetic, tables, methods/self, closures/upvalues, nested callbacks, recursion, numeric/generic loops, varargs, multiple returns, pcall/xpcall, coroutine senaryoları, metatables, environment globals, typed Luau fixture, event callbacks, menu dispatcher, worker isolation, privacy ve runtime resource estimation.

Güncel scaling testleri:

- 100: Good 24/%24; Pro 64/%64.
- 800: Good 160/%20; Pro 320/%40; sekiz kaynak bölgesinin tamamı kapsandı.
- 2000: Good 180/%9; Pro 400/%20; maksimum cap uygulandı.
- 2000 için güncel selection testi var; son scaling değişikliğinden sonra full generated runtime benchmark yeniden çalıştırılmadı.

Public beta artifact'i 48/48 build ve 48/48 native runtime success, 0 semantic mismatch raporluyor. Ancak `tests/generated/public-beta-matrix.json` son ratio-scaling değişikliğinden önce oluşturulduğu için içerdiği Good 12/Pro 64 büyük-script seçim değerleri güncel politika kanıtı olarak kullanılmamalıdır. Performans baseline'ı olarak maksimum build süreleri Light 5.72 s, Light+ 11.56 s, Good 1.45 s, Pro 3.45 s; maksimum runtime slowdown sırasıyla 1.32x, 2.16x, 1.06x ve 1.18x'tir.

Hell güncel sonucu:

- Hybrid runtime: geçti.
- Semantic audit: Good/Pro/Hell output, side effect ve error eşleşmeleri geçti; her profilde 21 function virtualized.
- 100 seed: 100 parseable build, 100 unique normalized fingerprint, similarity 0.01.
- `vmPresenceDetectionRate=1.0` kabul edilebilir yapısal tespittir; executable source recovery `0`.
- Blocker oranlar: opcode `0.125`, constant `1.0`, control-flow `1.0`, call `1.0`.

# 8. Bilinen sorunlar ve riskler

## Kritik

### Production account/credit provider yok

- Profil: tüm public beta/launch.
- Modül: `core/service/credit_ledger.js` ve dış provider entegrasyonu.
- Etki: Kontrollü ücretsiz beta çalışabilir; gerçek ücret/credit launch güvenli değildir.
- Çözüm: Kalıcı transactional provider, idempotency/rollback ve production integration testi.

### Arbitrary Roblox runtime sandbox yok

- Profil: tüm profiller.
- Modül: service/runtime validation.
- Etki: Kullanıcı kodu gerçek Roblox davranışıyla güvenli biçimde differential test edilemiyor.
- Çözüm: Side-effect-safe Roblox uyumlu sandbox; aksi halde mevcut parse/output validation sınırını açıkça koru.

## Yüksek

### Hell semantic recovery activation eşiklerini geçmiyor

- Profil: Hell.
- Modül: `semantic_recovery_analyzer.js`, VM constant/CFG/call generation.
- Etki: Hell test modunda doğru çalışsa da hedef anti-analysis seviyesinde değil.
- Çözüm: Runtime-dependent constant dependency, reconstructable logical PC map azaltma ve call graph virtualization; her değişiklikte semantic/runtime test.

### Hell full acceptance seed matrisi tamamlanmadı

- Profil: Hell.
- Modül: stress/fuzz/benchmark scripts.
- Etki: Public aktivasyon için ölçek ve seed güveni eksik.
- Çözüm: 100/250/500/1000/2000 için 5 Good + 5 Pro + 10 Hell seed matrisini native runtime'da tamamla.

## Orta

### Typed Luau desteği tam grammar değildir

- Profil: tümü.
- Modül: `core/preprocessor.js`.
- Etki: Yeni veya karmaşık type syntax parse öncesinde hata verebilir.
- Çözüm: Gerçek Luau parser frontend'i veya fixture tabanlı grammar genişletme.

### Dynamic feature registry'ler remap edilmez

- Profil: Good/Pro.
- Modül: `menu_constant_protector.js`.
- Etki: Tamamen dinamik UI DSL/registry bağlantıları daha okunabilir kalabilir.
- Çözüm: Scope ve escape analysis; güven kanıtlanamıyorsa mevcut fallback korunmalı.

### Güncel full-scale artifact eksik

- Profil: Good/Pro.
- Modül: benchmark/stress raporları.
- Etki: Eski JSON ile yeni ratio politikası karıştırılabilir.
- Çözüm: Public beta ve 100-2000 benchmark JSON'larını yeni selector ile yeniden üret.

## Düşük

### Runtime harness testleri paralel temp-prefix yarışına açık

- Profil: test altyapısı.
- Modül: `tests/runtime_harness.js`, `test_runtime_harness.js`.
- Etki: Paralel suite çalıştırıldığında false failure oluşabilir.
- Çözüm: Test-run ID'li temp prefix veya yalnızca testin kendi oluşturduğu dizinleri takip et.

### Dev mode kaynak isimlerini bilinçli gösterir

- Profil: development.
- Modül: server metadata.
- Etki: Dev raporu paylaşılırsa isim sızıntısı olabilir; release response F-ID kullanır.
- Çözüm: Production'da `devMode=false` zorunluluğunu koru.

# 9. Hedef profile kalan işler

Hedef profil: Hell Experimental.

- [x] Gerçek AST -> IR -> VM bytecode pipeline.
- [x] Shared interpreter clusters.
- [x] Constant-pool segmentation ve lazy resolution.
- [x] Fused/split opcode aileleri.
- [x] Nested prototype ve closure clustering.
- [x] 100/100 unique fingerprint ve 0.01 similarity.
- [x] Native Luau semantic audit.
- [ ] Constant semantic recovery azaltma — kalan işin yaklaşık %25'i.
- [ ] Control-flow/logical PC recovery azaltma — yaklaşık %20.
- [ ] Call semantic recovery azaltma — yaklaşık %20.
- [ ] Opcode semantic recovery'yi 0.10 altına çekme — yaklaşık %10.
- [ ] Full 5/5/10 seed scale acceptance — yaklaşık %15.
- [ ] Benchmark bütçeleri ve frontend/operational activation gate — yaklaşık %10.

Özet:

```text
Mevcut açık profil: Pro (Available); önerilen stabil profil Good
Geliştirilmekte olan profil: Hell
Hedef profil: Hell Experimental
Hedef profile tahmini kalan oran: %35
Hedef profile kalan ana Phase sayısı: 2 (semantic hardening + acceptance/activation)
En büyük blocker: constant/control-flow/call semantic recovery oranlarının 1.0 olması
Sıradaki önerilen adım: semantic analyzer'ın kolay geri kazandığı constant dependency ve logical PC map kök nedenlerini fixture bazında azaltmak
```

# 10. Sonraki çalışma planı

1. **Yeni scaling baseline'larını kalıcılaştır.** Önce yapılmalı çünkü eski public-beta artifact'i güncel selector'ı temsil etmiyor. Bağımlılık: native Luau. Kriter: 100/800/2000 Good/Pro build/runtime JSON ve budget pass.
2. **Hell constant recovery kök nedenini parçala.** En yüksek semantic blocker'lardan biridir. Bağımlılık: semantic analyzer. Kriter: constant recovery anlamlı biçimde düşerken tüm differential testler geçmeli.
3. **Logical PC/control-flow recovery'yi azalt.** Constant değişiminden sonra yapılmalı; iki katmanın hata ayıklaması ayrılmalı. Kriter: control-flow recovery <=0.10 ve PC validation pass.
4. **Call semantic recovery katmanını güçlendir.** Shared clusters ve callbacks korunarak call graph reconstruction azaltılmalı. Kriter: call recovery <=0.10; method/pcall/callback fixture'ları aynı davranmalı.
5. **Opcode recovery'yi 0.10 altına indir.** Mevcut 0.125 küçük fakat gate üstünde. Kriter: 100 seed ortalaması <=0.10.
6. **Hell full seed/scale acceptance çalıştır.** Önceki semantic değişiklikler sabitlendikten sonra pahalı matris çalıştırılmalı. Kriter: bütün corpus/seed'lerde runtime match, budget ve memory pass.
7. **Runtime harness temp izolasyonunu düzelt.** CI paralelliğinde false negative'i önler. Kriter: runtime-harness ile Hell testleri paralel çalışırken cleanup testi geçmeli.
8. **Hell activation gate'i tek kaynaktan yönet.** `HELL_ENABLED`, server profile availability ve frontend card aynı readiness sonucuna bağlanmalı. Kriter: blocker varken unavailable, tüm kapılar geçince Experimental.
9. **Production account/credit provider tasarla.** Hell'den bağımsız public launch blocker'ıdır. Kriter: durable idempotency, rollback ve concurrency testleri.
10. **Typed Luau corpus'unu genişlet.** Profil aktivasyonundan sonra compatibility borcunu azaltır. Kriter: desteklenen syntax matrisi ve precise fallback/error konumu.

# 11. Yapay zekâ için kalıcı bağlam özeti

SukaRed 1.0, Node.js/Express tabanlı bir Lua/Luau obfuscator servisidir. Amaç “kırılamazlık” iddiası değil, AST dönüşümleri, constant/string protection ve gerçek function-level VM virtualization ile tersine mühendislik maliyetini artırmaktır. Repository kökü `C:\Users\missk\Desktop\Important\Obfuscator`, backend `Backend`, frontend ise root `index.html`, `style.css` ve `app/*` dosyalarındadır. Ürün sürümü her yerde `SukaRed 1.0` olarak tutulmalıdır.

Public profil sırası Light, Light+, Good, Pro, Hell, Blatant, Fatality'dir. Light ve Light+ available ve VM'sizdir. Good available/recommended olup selective budgeted VM kullanır. Pro available ve aggressive VM kullanır. Hell, Blatant ve Fatality normal kullanıcıya kapalıdır. Kullanıcıya açık en yüksek profil Pro, önerilen stabil profil Good, geliştirilmekte olan ve sıradaki aktivasyon hedefi Hell Experimental'dır. Blatant/Fatality yalnızca merkezi budget policy ve kilitli UI placeholder düzeyindedir; bağımsız kabul edilmiş pipeline'ları yoktur.

Production pipeline public profil normalizasyonu, Luau preprocess, AST parse/scope analysis, function selection, AST -> IR -> custom bytecode compilation, function body replacement, generated interpreter/constant pool üretimi, dead-code, uygun post-AST dönüşümleri, decoder attachment, minification ve output validation sırasını izler. VM tüm scripti encoded payload/loadstring olarak çalıştırmaz. Seçilen function body generated normal Lua içinden kaldırılır ve register + instruction pointer kullanan custom interpreter tarafından yürütülür.

Resmi olarak kodda görülen Phase 1 temel gerçek VM'dir: LOAD_CONST/MOVE/GET_GLOBAL/arithmetic/CALL/RETURN. Phase 2 tables, GET/SET_TABLE, SELF/method calls, nil, vararg ve multiple return ekler. Phase 3 if/while/repeat/numeric-generic loops ve jumps ekler. Phase 4 nested closures, CLOSURE, recursive upvalues, sibling cells ve loop iteration capture semantiğini tamamlar. Phase 4 sonrası resmi numaralar belirsizdir; production reporting/Good-Pro budgets, Hell shared clusters/fused opcodes, adversarial recovery ve son olarak scalable selection/menu protection etapları uygulanmıştır.

VM local, anonymous ve desteklenen table/colon method declarations; tables/member access; arithmetic/concat/comparison/logical expressions; loops; nested/returned callbacks; recursion; varargs ve multiple return destekler. Anonymous pcall/task/event callbacks gerçek production route üzerinden testlidir. `self` receiver bir kez değerlendirilir. Closure/upvalue semantiği ve numeric/generic loop iteration cells regression testlidir. `DoStatement`, whitelist dışı AST türleri, profile node limitini aşan fonksiyonlar ve bazı coroutine/yield sınırları normal fallback veya dedicated interpreter kullanabilir. Executor API'leri emüle edilmez.

Son değişiklik sabit 24/64 VM seçimini merkezi scalable policy ile değiştirdi. Good min 24, hedef %20, max 180; Pro min 64, hedef %40, max 400 kullanır. Hell %65/max800, Blatant %85/max1600 ve Fatality %100/max5000 policy olarak tanımlı ancak kapalıdır. Selector instruction/bytecode/complexity/time/interpreter bütçelerini, function estimated cost ve protection score'u birlikte kullanır. Menu callbacks, event handlers ve dispatchers mandatory core'dur; call-graph komşuları önceliklendirilir ve seçim sekiz source region'a dengeli yayılır. Aynı seed aynı selection'ı üretir. Static ve güvenle analiz edilen callback/feature registry ID'leri build-specific opaque ID'lere remap edilir; dinamik/unsafe registry semantik riske girmeden fallback olur.

Güncel scaling testi: 100 fonksiyonda Good 24, Pro 64; 800'de Good 160/%20 ve Pro 320/%40; 2000'de cap nedeniyle Good 180/%9 ve Pro 400/%20. 800 seçimi sekiz source region'ın tamamını kapsar. Menu fixture'da 2/2 menu callback, 1/1 event handler ve 1/1 dispatcher virtualized; runtime output original ile `16` olarak eşleşir. Son `test:regressions`, service, Hell runtime, semantic audit, runtime harness ve 100-seed adversarial suite'leri geçmiştir. Runtime harness paralel Hell testi sırasında bir kez yabancı temp klasörü görüp false-fail vermiş, isolated rerun geçmiştir.

Hell fonksiyonel test modunda shared clusters, segmented constant pools, fused/split opcodes ve nested prototype clustering kullanır. Güncel Hell hybrid testinde 10 virtualized, 9 clustered, 1 dedicated, 4 shared cluster, 18 fused, 8 split ve 24 shuffled block vardır. 100 seed testi 100 unique normalized fingerprint ve 0.01 similarity üretir. Buna rağmen Hell hazır değildir: `HELL_ENABLED=false`; opcode semantic recovery 0.125, constant recovery 1.0, control-flow recovery 1.0 ve call recovery 1.0'dır. Executable source recovery 0 olsa da aktivasyon gate'i semantic oranlar nedeniyle geçmez. Full 5 Good/5 Pro/10 Hell seed matrisi her 100/250/500/1000/2000 corpus için tamamlanmamıştır.

Güncel ilerleme tahmini: Pro %90, Hell %65, tüm SukaRed v1.0 %82, VM %86, menu/callback koruması %85, test altyapısı %88, site/beta %80. En büyük teknik hedef constant/control-flow/call semantic recovery'yi azaltmak ve ardından full scale acceptance çalıştırmaktır. En büyük operasyonel launch blocker'ları production account/credit provider ve side-effect-safe arbitrary Roblox runtime sandbox eksikliğidir. Eski `tests/generated/public-beta-matrix.json` son scalable selector değişikliğinden önce üretildiği için içindeki Good 12/Pro 64 büyük-script değerleri güncel kabul edilmemelidir; yeni baseline'lar kalıcı JSON olarak yeniden üretilmelidir.
