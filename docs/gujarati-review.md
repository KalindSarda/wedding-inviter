# Gujarati draft: review sheet

**Status: DRAFT, written by Claude at the owner's request, NOT yet reviewed by a Gujarati speaker.**
Edit `i18n/gu.json` and the `gu` fields in `config/events.json` directly; this table is only a side-by-side aid.
Regenerate it with `node scripts/gujarati-review.mjs`.

Check: tone and humour (jokes do not translate literally), form of address (તમે vs આપ), spelling, and the couple names (dummy).

## UI strings

| Key | English | Gujarati draft |
|---|---|---|
| `lang.toggle` | ગુજરાતી | English |
| `lang.toggleLabel` | Switch language to Gujarati | ભાષા અંગ્રેજીમાં બદલો |
| `poster.kicker` | A Aarav & Diya Production | એક આરવ અને દિયા પ્રોડક્શન |
| `poster.title` | The Wedding | લગ્નોત્સવ |
| `poster.tagline` | Now showing at a lawn near you | હવે તમારી નજીકના લૉનમાં ચાલી રહ્યું છે |
| `poster.cta` | Tap to begin | શરૂ કરવા ટેપ કરો |
| `envelope.cta` | Tap to open your invitation | તમારું આમંત્રણ ખોલવા ટેપ કરો |
| `envelope.for` | For {name} | {name} માટે |
| `intro.skip` | Skip intro | ઇન્ટ્રો છોડો |
| `greeting.title` | {name}, you're invited | {name}, તમે આમંત્રિત છો |
| `greeting.sub` | Aarav & Diya are getting married, and the guest list would be incomplete without you. | આરવ અને દિયાનાં લગ્ન છે, અને તમારા વગર મહેમાનોની યાદી અધૂરી રહેશે. |
| `greeting.scroll` | Scroll for the plot | વાર્તા જાણવા નીચે સ્ક્રોલ કરો |
| `story.heading` | The story so far | અત્યાર સુધીની વાર્તા |
| `story.p1` | [Placeholder story] Two people. One very long group chat. A proposal that was definitely not a surprise to anyone. | [નમૂનારૂપ વાર્તા] બે વ્યક્તિ. એક બહુ લાંબું ગ્રુપ ચેટ. અને એક પ્રસ્તાવ, જે કોઈ માટે સરપ્રાઇઝ નહોતો. |
| `story.p2` | [Placeholder story] Now there is a wedding to plan, relatives to seat, and a playlist that will start arguments. | [નમૂનારૂપ વાર્તા] હવે લગ્નનું આયોજન કરવાનું છે, સગાંઓને બેસાડવાના છે, અને એવી પ્લેલિસ્ટ બનાવવાની છે જે ઝઘડા શરૂ કરાવશે. |
| `story.p3` | [Placeholder story] The only thing missing from the final scene is you. | [નમૂનારૂપ વાર્તા] છેલ્લા દૃશ્યમાં બસ એક જ વસ્તુ ખૂટે છે — તમે. |
| `countdown.heading` | The countdown | ગણતરી શરૂ |
| `countdown.days` | Days | દિવસ |
| `countdown.hours` | Hours | કલાક |
| `countdown.minutes` | Minutes | મિનિટ |
| `countdown.seconds` | Seconds | સેકન્ડ |
| `countdown.done` | It's showtime! | શો ટાઇમ! |
| `events.heading` | Where you'll be | તમે ક્યાં હશો |
| `events.when` | When | ક્યારે |
| `events.where` | Where | ક્યાં |
| `events.dress` | Dress code | પોશાક |
| `events.map` | Open in Maps | નકશામાં ખોલો |
| `events.none` | Details coming soon. | વિગતો ટૂંક સમયમાં. |
| `rsvp.heading` | Will you be there? | શું તમે આવશો? |
| `rsvp.sub` | One tap is all it takes. You can change your mind later. | ફક્ત એક ટેપ કરો. પછી મન બદલાય તો ફેરફાર કરી શકશો. |
| `rsvp.yes` | Yes, I'm coming | હા, હું આવીશ |
| `rsvp.no` | Sorry, can't make it | માફ કરજો, નહીં આવી શકું |
| `rsvp.yesDone` | Wonderful! We've saved you a seat (and a plate). | વાહ! તમારા માટે એક ખુરશી (અને એક થાળી) રિઝર્વ કરી દીધી છે. |
| `rsvp.noDone` | We'll miss you! Expect a very dramatic photo update. | અમને તમારી ખોટ સાલશે! ફોટા ખૂબ નાટકીય રીતે મોકલીશું. |
| `rsvp.current` | Your answer: {answer} | તમારો જવાબ: {answer} |
| `rsvp.answerYes` | Yes | હા |
| `rsvp.answerNo` | No | ના |
| `rsvp.change` | Change my answer | મારો જવાબ બદલો |
| `faq.heading` | Frequently asked (and mostly answered) | વારંવાર પૂછાતા (અને મોટે ભાગે જવાબ મળેલા) પ્રશ્નો |
| `faq.q1` | Is there food? | જમવાનું છે? |
| `faq.a1` | Yes. Come hungry, leave in a food coma. | હા. ભૂખ્યા આવજો, અને જમ્યા પછી ઊંઘ આવી જાય એવા થઈને જજો. |
| `faq.q2` | Is there a dress code? | ડ્રેસ કોડ છે? |
| `faq.a2` | Look good. The photographer is watching. (Real details are in the events above.) | સરસ તૈયાર થઈને આવજો. ફોટોગ્રાફર નજર રાખે છે. (સાચી વિગતો ઉપર કાર્યક્રમોમાં છે.) |
| `faq.q3` | Do I need to bring a gift? | ભેટ લાવવી પડશે? |
| `faq.a3` | Your presence is the gift. An envelope is also very good presence. | તમારી હાજરી જ ભેટ છે. અને કવર પણ ખૂબ સરસ હાજરી ગણાય. |
| `faq.q4` | Will the groom actually dance? | શું વરરાજા ખરેખર નાચશે? |
| `faq.a4` | Rumours say yes. We'll let you decide. | અફવા છે કે હા. નક્કી તમે કરજો. |
| `faq.q5` | Are kids allowed? | બાળકોને લાવી શકાય? |
| `faq.a5` | Yes, and so is the chaos that comes with them. | હા, અને સાથે તેમની ધમાલ પણ આવશે. |
| `faq.q6` | What time should I actually arrive? | હકીકતમાં કેટલા વાગે પહોંચવું? |
| `faq.a6` | Indian Standard Time is a lovely concept. The ceremony, however, starts on time. | ભારતીય સમય એક સુંદર કલ્પના છે. પરંતુ લગ્નવિધિ સમયસર શરૂ થશે. |
| `faq.q7` | What if I cry during the ceremony? | સમારોહમાં મને રડવું આવી જાય તો? |
| `faq.a7` | Tissues are provided. Dignity is not. | રૂમાલ આપવામાં આવશે. ગૌરવ નહીં. |
| `footer.credits` | Made with love, chai and far too many spreadsheets. | પ્રેમ, ચા અને ઘણી બધી સ્પ્રેડશીટ સાથે બનાવેલું. |
| `loading` | Opening your invitation… | તમારું આમંત્રણ ખૂલી રહ્યું છે… |
| `notfound.title` | We couldn't find this invitation | આ આમંત્રણ મળ્યું નથી |
| `notfound.body` | Please check the link you received, or ask the person who sent it to you. | કૃપા કરીને તમને મળેલી લિંક ફરી તપાસો, અથવા તમને મોકલનાર વ્યક્તિને પૂછો. |
| `error.title` | Something went wrong | કંઈક ખોટું થયું |
| `error.body` | Please check your connection and try again. | કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસીને ફરી પ્રયાસ કરો. |
| `error.retry` | Try again | ફરી પ્રયાસ કરો |
| `rsvp.saving` | Saving… | સાચવી રહ્યા છીએ… |
| `rsvp.error` | We couldn't save your answer. Please check your connection and tap again. | તમારો જવાબ સાચવી શકાયો નહીં. કૃપા કરીને ઇન્ટરનેટ તપાસીને ફરી ટેપ કરો. |
| `rsvp.cancel` | Keep my answer | મારો જવાબ રાખો |

## Events (config/events.json)

| Slug | Field | English | Gujarati |
|---|---|---|---|
| sangeet | name | Sangeet (dummy) | સંગીત (નમૂનો) |
| sangeet | venue | Dummy Banquet Hall, City | [GU-PLACEHOLDER] સ્થળ |
| sangeet | dressCode | Festive | ઉત્સવી |
| wedding | name | Wedding Ceremony (dummy) | લગ્ન વિધિ (નમૂનો) |
| wedding | venue | Dummy Wedding Lawn, City | [GU-PLACEHOLDER] સ્થળ |
| wedding | dressCode | Traditional | પરંપરાગત |
| reception | name | Reception (dummy) | રિસેપ્શન (નમૂનો) |
| reception | venue | Dummy Grand Ballroom, City | [GU-PLACEHOLDER] સ્થળ |
| reception | dressCode | Formal | ઔપચારિક |
