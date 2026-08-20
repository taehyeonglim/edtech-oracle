---
type: answer
command: debate
question: 컴퓨터 기반 학습에서 멀티미디어는 인지부하에 해로운가?
asked: '2026-08-20'
speakers:
  - john-sweller
  - richard-mayer
  - jeroen-van-merrienboer
  - robert-kozma
rounds_run: 2
note: >-
  세션 지시에 따라 라운드 1(입장 표명)·2(반박)까지 진행했다. 라운드 3(쟁점 정리)은 실행하지 않았다. 문서 순서가 라운드 순서다 —
  각 slug의 첫 섹션이 라운드 1, 두 번째 섹션이 라운드 2다.
check:
  status: violations
  forge: 0
  form: 70
  markers:
    근거: 49
    적용: 7
    근거없음: 7
---

## john-sweller

**멀티미디어 자체가 아니라 형식이 인지부하를 결정한다** [근거]

멀티미디어가 인지부하에 해로운지 묻는다면, 나는 "멀티미디어 자체"가 아니라 "그것을 어떻게 조직했는가"가 답을 가른다고 말하겠다. 나와 챈들러가 수행한 여섯 실험에서, 서로 참조하는 글과 도표를 따로 배치한 전통적 형식은 학습자가 두 정보원을 머릿속에서 오가며 통합하도록 강요했고, 이 통합 자체가 학습과 무관한 부담이었다. 정보를 물리적으로 통합해 제시하자 이 부담이 줄고 이해가 개선되었다.[^chandler-sweller-1991-instruction-format]

**정보가 서로를 필요로 할 때만 통합이 유리하다** [근거]

같은 연구에서 중요한 단서를 하나 더 얻었다. 글과 도표 각각이 독립적으로 이해 가능할 때는 통합 형식의 이점이 사라졌고, 오히려 불필요한 설명을 추가하는 것은 유해할 수 있었다. 즉 멀티미디어 요소들이 서로 참조해야만 의미가 완성되는 관계(주의분할 효과의 조건)일 때는 통합이 부하를 줄이지만, 각 요소가 이미 자기완결적이면 같은 요소를 덧붙이는 것 자체가 중복 부하를 만든다.[^chandler-sweller-1991-instruction-format]

**작업기억의 이중 채널 구조를 알아야 설계를 판단할 수 있다** [근거]

이 현상을 설명하려면 작업기억의 구조를 봐야 한다. 반 메리엔보어·파스와 나는 작업기억을 청각·언어 정보와 시각·공간 정보를 다루는, 부분적으로 독립된 제한 용량 체계로 정리했다. 화면과 음성을 동시에 쓰는 멀티미디어 설계가 때로 유리한 것은 이 두 채널을 나누어 쓸 수 있기 때문이지만, 이는 채널을 나누는 것 자체가 목적이 아니라 각 채널의 용량 한계를 넘지 않게 관리하는 수단일 뿐이다.[^sweller-merrienboer-paas-1998-cognitive-architecture]

**"부하를 없애라"가 아니라 "불필요한 부하를 줄여라"다** [근거]

인지부하이론은 애초에 모든 도전이나 복잡성을 제거하라는 주장이 아니다. 학습목표 자체의 복잡성(고유부하)은 관리 대상이 아니고, 흩어진 정보·중복 설명·불필요한 탐색처럼 학습에 기여하지 않는 요구(외생부하)를 줄이는 것이 핵심이다. 멀티미디어를 무조건 나쁘다고 하거나 무조건 좋다고 하는 이분법은 이 구분을 놓친다.[^bio-sweller-unsw][^sweller-2011]

**전문성에 따라 같은 멀티미디어 설계의 효과가 뒤집힌다** [근거]

더 나아가, 초보자에게 유익한 통합 설명이나 이중 채널 자료가 전문가에게는 불필요한 중복이 될 수 있다는 전문성 역전 효과가 있다. 이 효과는 설계 원리가 학습자의 사전지식 상태에 따라 달라진다는 것을 보여주므로, "멀티미디어는 해롭다/이롭다"라는 일반 명제 자체가 학습자를 특정하지 않으면 성립하지 않는다.[^bio-sweller-unsw][^sweller-2011]

**컴퓨터 기반 학습에 적용하면, 화면 안에서의 통합·동시성 설계가 핵심 변수가 된다** [적용]

이는 내가 직접 연구한 범위를 넘어서는 추론이지만, 챈들러·스웰러의 통합 원리와 이중 채널 구조를 컴퓨터 기반 학습 환경에 적용하면 다음을 예상할 수 있다. 화면에 텍스트·이미지·음성이 동시에 배치되더라도 서로 참조해야 의미가 완성되는 요소들을 공간적·시간적으로 인접시키면 부하가 줄고, 반대로 이미 자기완결적인 정보에 나레이션이나 자막을 겹쳐 넣으면 중복부하가 발생할 가능성이 크다. 이 예측은 1991년 연구의 원리를 화면 기반 매체로 확장한 것이며, 내가 직접 컴퓨터 기반 학습 환경을 실험한 문헌에 근거한 것은 아니다.[^chandler-sweller-1991-instruction-format]

**따라서 질문 자체에 답한다면, "해롭다/해롭지 않다"의 이분법을 거부한다** [근거]

내 문헌이 뒷받침하는 결론은 이렇다. 멀티미디어는 그 자체로 인지부하에 해롭지도 이롭지도 않다. 정보원들이 통합을 요구하는데 분리되어 제시되면(주의분할) 해롭고, 정보원이 이미 자기완결적인데 중복해서 덧붙이면(중복) 역시 해롭다. 반대로 통합이 필요한 정보를 실제로 통합해 제시하면 이롭다. 해로움의 원인은 매체의 수가 아니라 요소 간 상호참조 관계와 학습자의 사전지식이다.[^chandler-sweller-1991-instruction-format][^sweller-merrienboer-paas-1998-cognitive-architecture][^sweller-2011]

[^bio-sweller-unsw]: School of Education. Emeritus Professor John Sweller. UNSW Sydney. <https://www.unsw.edu.au/staff/john-sweller> — tier B · [[sources/bio-sweller-unsw]]
[^chandler-sweller-1991-instruction-format]: Paul Chandler; John Sweller. (1991). Cognitive Load Theory and the Format of Instruction. Cognition and Instruction, 8(4), 293–332. DOI: 10.1207/s1532690xci0804_2. <https://doi.org/10.1207/s1532690xci0804_2> — tier A · [[sources/chandler-sweller-1991-instruction-format]]
[^sweller-2011]: John Sweller; Paul Ayres; Slava Kalyuga. (2011). Cognitive Load Theory. Springer. DOI: 10.1007/978-1-4419-8126-4. <https://doi.org/10.1007/978-1-4419-8126-4> — tier B · [[sources/sweller-2011]]
[^sweller-merrienboer-paas-1998-cognitive-architecture]: John Sweller; Jeroen J. G. van Merrienboer; Fred G. W. C. Paas. (1998). Cognitive Architecture and Instructional Design. Educational Psychology Review, 10(3), 251–296. DOI: 10.1023/A:1022193728205. <https://doi.org/10.1023/A:1022193728205> — tier A · [[sources/sweller-merrienboer-paas-1998-cognitive-architecture]]

## richard-mayer

**멀티미디어 자체가 인지부하에 해로운 것이 아니라, 설계가 처리해야 할 인지 자원을 늘리는지 줄이는지가 관건이다** [근거]

내 이론의 출발점은 사람이 화면에 제시된 정보를 그대로 저장하지 않는다는 것이다. 학습자는 시각 채널과 언어 채널에서 각각 제한된 작업기억 용량 안에서 정보를 선택하고, 조직하고, 서로 연결하는 능동적 처리를 수행해야 학습이 일어난다.[^mayer-1997][^mayer-2005][^reiser-2017] 이 전제 자체가 이미 답을 함축한다 — 멀티미디어가 해로운지 여부는 매체의 존재가 아니라 그 매체가 이 세 과정(선택·조직·통합)에 필요한 인지 자원을 어떻게 소비하게 만드는가에 달려 있다.

**분할 주의 효과가 보여주는 것은 "멀티미디어가 나쁘다"가 아니라 "나쁜 배치가 나쁘다"는 것이다** [근거]

나와 모레노가 수행한 분할 주의 실험은 화면과 텍스트가 공간적으로 분리되어 있을 때 학습자가 둘을 시선으로 오가며 대응시키는 부담이 추가로 발생해 작업기억에서 처리할 여유가 줄어드는 것을 보여준다. 이는 작업기억 안에 이중 처리 체계가 있다는 근거로 해석했다.[^mayer-1997] 같은 정보량이라도 배치 방식에 따라 부과되는 부담이 달라진다는 뜻이므로, 이 결과는 멀티미디어 일반을 기피할 근거가 아니라 특정 배치를 피할 근거다.

**핵심주장은 "정보를 더하는 일이 아니다"라는 명제로 요약된다** [근거]

화면에 그림과 애니메이션을 추가한다고 학습이 자동으로 좋아지지 않는다. 장식용 이미지, 이미 텍스트에 있는 내용을 그대로 반복하는 내레이션은 학습자가 처리할 필요가 없는 정보까지 처리하게 만들어 핵심 내용에 쓸 자원을 빼앗을 수 있다.[^mayer-1997][^mayer-2005] 이 관점에서 멀티미디어가 인지부하에 해로워지는 경로는 뚜렷하다 — 매체 자체가 아니라 학습과 무관한 처리를 강요하는 잉여 요소가 원인이다.

**신호화·분절·공간적 인접성·중복 회피는 이 위험을 관리하기 위한 설계 휴리스틱이다** [근거]

나는 이 원리들을 절대 규칙이 아니라 학습자의 인지 자원을 핵심 내용에 배분하기 위한, 실험적 근거를 가진 설계 가설로 제시했다. 맥락과 학습자에 따라 효과가 달라질 수 있다는 점을 함께 명시했다.[^mayer-2005] 이는 곧 "멀티미디어는 인지부하에 해롭다"는 일반 명제 자체를 내가 세우지 않는다는 뜻이다. 나는 해로울 수 있는 조건(분할 주의, 중복, 비신호화, 비분절)을 특정하고 그것을 피하는 설계를 제안하는 쪽이다.

**이 원리 전체는 내 것이 아니라 인지부하 이론이라는 더 큰 모형에 딸린 결론이다** [근거]

내 설계 원리들은 작업기억 용량이 제한적이라는 전제 위에 서 있다. 이 전제는 스웰러의 인지부하 이론에서 왔고, 문제 해결 중 인지부하가 학습에 미치는 효과에 관한 실증 연구와 이후의 이론적 정리가 그 근거다.[^sweller-1988][^sweller-2011] 그 전제가 흔들리면 내 원리의 근거도 함께 흔들린다는 것이 내 페이지에 적어둔 한계다 — 원리는 독립적으로 서 있는 경험 법칙이 아니라 특정 인지 구조 모형에 딸린 따름정리이기 때문이다.

**따라서 내 입장은 "멀티미디어가 인지부하에 해롭다"가 아니라 "잘못 설계된 멀티미디어가 외재적 인지부하를 늘려 학습을 방해할 수 있다"는 조건부 명제다** [근거]

이 구분은 중요하다. 매체 자체를 원인으로 지목하면 멀티미디어를 쓰지 않는 것이 해법이 되지만, 내 연구가 실제로 가리키는 것은 설계 변수(분할된 배치, 중복된 채널, 신호 없는 화면, 분절되지 않은 긴 시퀀스)다.[^mayer-1997][^mayer-2005] 같은 콘텐츠를 화면 인접 배치, 신호화, 적절한 분절로 다시 설계하면 동일한 정보량이라도 부담이 줄어든다는 것이 이 연구 프로그램의 실질적 주장이다.

**다만 이 결론의 근거 대부분은 짧고 잘 통제된 실험실 과제에서 나왔다는 한계를 인정해야 한다** [근거]

통제가 강할수록 인과 추론은 선명해지지만, 실제 교실에서의 지속 기간·동기·사회적 맥락은 그 설계에서 제거된다. 생태 타당도는 이 연구 프로그램이 구조적으로 지불하는 비용이다.[^mayer-2005] 따라서 "이 원리는 몇 초에서 몇 분 단위의 학습 과제에서 인지부하를 줄인다"는 명제는 근거가 있지만, 몇 주에 걸친 프로젝트형 학습이나 협력적 과제에서도 같은 방식으로 성립하는지는 내 문헌만으로는 답할 수 없다.

**현대의 적응형·인터랙티브 컴퓨터 기반 학습 환경에 이 원리를 적용한다면, 학습자가 스스로 속도와 순서를 조절할 수 있는 인터페이스는 원리상 분절 효과를 학습자 통제로 확장한 것이라 볼 수 있다** [적용]

내 문헌은 분절(정보를 학습자가 소화 가능한 단위로 나누는 것)이 인지부하를 관리하는 원리라고 말한다.[^mayer-2005] 온라인 튜터나 적응형 시스템에서 학습자가 재생을 멈추거나 되돌릴 수 있는 기능은 이 분절 원리를 학습자가 직접 통제하는 형태로 확장한 것으로 추론할 수 있다. 다만 이는 내가 직접 연구한 것이 아니라 원리로부터의 추론이며, 실제 효과는 별도로 검증되어야 한다.

**생성형 AI가 만든 이미지나 애니메이션을 대량으로 덧붙이는 최근의 관행에 대해서는 내 문헌에 직접적 근거가 없다** [근거없음]

이런 도구를 내가 연구한 적이 없으므로 그 효과를 내 이론에서 곧바로 도출할 수 없다. 다만 화려함이 처리 부담과 별개라는 내 핵심 명제는 이런 새로운 도구에도 적용될 개연성이 있다는 점만 [적용]으로 언급할 수 있다 — 콘텐츠가 학습자에게 필요한 선택·조직·통합을 돕는지가 여전히 관건이지, 생성 방식이 AI인지 사람인지는 내 이론의 변수가 아니다.[^mayer-2005]

[^mayer-1997]: Richard E. Mayer; Roxana Moreno. (1998). A Split-Attention Effect in Multimedia Learning: Evidence for Dual Processing Systems in Working Memory. Journal of Educational Psychology, 90(2). DOI: 10.1037/0022-0663.90.2.312. <https://doi.org/10.1037/0022-0663.90.2.312> — tier A · [[sources/mayer-1997]]
[^mayer-2005]: Richard E. Mayer (ed.). (2005). The Cambridge Handbook of Multimedia Learning. Cambridge University Press. <https://assets.cambridge.org/052183/8738/frontmatter/0521838738_frontmatter.htm> — tier B · [[sources/mayer-2005]]
[^reiser-2017]: Robert A. Reiser; John V. Dempsey (eds.). (2017). Trends and Issues in Instructional Design and Technology. Pearson. <https://www.pearson.com/en-us/subject-catalog/p/trends-and-issues-in-instructional-design-and-technology/P200000006222> — tier B · [[sources/reiser-2017]]
[^sweller-1988]: John Sweller. (1988). Cognitive Load During Problem Solving: Effects on Learning. Cognitive Science, 12(2). DOI: 10.1207/s15516709cog1202_4. <https://doi.org/10.1207/s15516709cog1202_4> — tier A · [[sources/sweller-1988]]
[^sweller-2011]: John Sweller; Paul Ayres; Slava Kalyuga. (2011). Cognitive Load Theory. Springer. DOI: 10.1007/978-1-4419-8126-4. <https://doi.org/10.1007/978-1-4419-8126-4> — tier B · [[sources/sweller-2011]]

## jeroen-van-merrienboer

컴퓨터 기반 학습에서 멀티미디어는 인지부하에 해로운가?

**멀티미디어 자체는 해롭지 않다. 부하의 종류를 구분해야 한다** [근거]
이 질문은 매체 하나를 놓고 해로운지 묻지만, 나와 스웰러가 보건전문교육을 위해 제시한 지침은 부하를 불필요한 부하(extraneous), 내재적 부하(intrinsic), 학습 관련 부하(germane)로 나누고 설계자는 불필요한 부하를 줄이고 내재적 부하를 관리하며 학습 관련 부하를 최적화해야 한다고 말한다. 멀티미디어는 이 세 부하 중 어느 쪽으로도 작용할 수 있어, 매체 자체가 아니라 설계가 결과를 가른다.[^merrienboer-sweller-2010-health]

**4C/ID의 네 구성요소마다 멀티미디어가 촉진해야 할 인지과정이 다르다** [근거]
케스터와 함께 쓴 글에서 나는 학습과제, 지원정보, 절차정보, 부분과제 연습이라는 네 요소가 멀티미디어 환경에서 서로 다른 인지과정을 촉진하도록 연결되어야 한다고 밝혔다. 학습과제는 귀납을, 지원정보는 정교화와 의식적 추상화를, 절차정보는 지식 편집을, 부분과제 연습은 심리적 강화 과정을 주로 돕는다. 하나의 멀티미디어 원리를 네 요소 모두에 똑같이 적용하면 오히려 부적절한 부하를 만들 수 있다.[^merrienboer-kester-2014-multimedia]

**실험 근거: worked example의 변이성이 전이를 높인다** [근거]
파스와 함께 수행한 기하 문제해결 연구에서, 컴퓨터 기반 훈련의 네 전략을 비교한 결과 worked example이 전이를 높이는 데 유용했다. 이는 멀티미디어 자체가 아니라 예시를 어떻게 구성하고 변이시키는지가 부하와 학습 결과를 결정한다는 것을 보여준다.[^paas-merrienboer-1994-variability]

**복합과제에서는 부하를 무조건 줄이는 것이 능사가 아니다** [근거]
케스터, 파스와 함께 쓴 논문에서 나는 낮은 변이성과 완전한 안내가 파지에는 유리해도 전이를 방해할 수 있다고 지적했다. 초보자의 초기 내재적 부하는 낮추되, 높은 변이성과 제한된 안내·피드백을 결합해야 전이가 촉진된다. 멀티미디어가 부하를 낮추는 방향으로만 설계되면 학습 관련 부하까지 줄여 전이를 해칠 수 있다.[^merrienboer-et-al-2006-complex-tasks]

**전체과제 설계 관점에서 본 멀티미디어의 위치** [근거]
4C/ID는 복합한 전문역량을 고립된 하위기능이 아니라 실제적인 전체과제를 중심으로 설계한다. 멀티미디어는 이 전체과제 계열 안에서 지원정보와 절차정보를 적시에 제시하는 도구일 뿐, 전체과제 원리를 대체하지 않는다. 따라서 멀티미디어가 해로운가라는 질문은 그것이 어느 구성요소에서 어떤 기능을 수행하도록 설계되었는가로 바꿔 물어야 한다.[^merrienboer-2002][^merrienboer-1997]

**적용: 현대의 동영상·인터랙티브 학습 환경** [적용]
내가 문헌에서 다룬 것은 1990년대에서 2010년대까지의 컴퓨터 기반 훈련과 의료교육 환경이지, 그 이후 등장한 적응형 동영상 플랫폼이나 몰입형 시뮬레이션은 아니다. 다만 네 구성요소 원리를 추론적으로 적용하면, 짧은 동영상이나 인터랙티브 요소를 전체과제와 무관하게 흥미 유발용으로만 덧붙이는 설계는 불필요한 부하를 늘릴 가능성이 크고, 반대로 지원정보를 적시에 제시하는 데 쓰는 멀티미디어는 학습 관련 부하를 촉진할 수 있다고 본다. 이는 내가 직접 검증한 것이 아니라 4C/ID 원리로부터의 추론이다.[^merrienboer-kester-2014-multimedia]

**한계** [근거없음]
멀티미디어 학습의 개별 원리(예: 중복 원리, 근접성 원리 같은 마이어 계열의 세부 실험)는 내 문헌에 직접 등장하지 않는다. 나는 그런 원리들이 4C/ID의 네 구성요소 안에서 어떻게 다르게 작동해야 하는지를 다뤘을 뿐, 각 원리의 개별 실험 결과를 내 저작에서 직접 재현하지는 않았으므로 이 부분은 근거없음으로 남긴다.

[^merrienboer-sweller-2010-health]: Jeroen J. G. van Merriënboer; John Sweller. (2010). Cognitive Load Theory in Health Professional Education: Design Principles and Strategies. Medical Education, 44(1), 85–93. DOI: 10.1111/j.1365-2923.2009.03498.x. <https://doi.org/10.1111/j.1365-2923.2009.03498.x> — tier A · [[sources/merrienboer-sweller-2010-health]]
[^merrienboer-kester-2014-multimedia]: Jeroen J. G. van Merriënboer; Liesbeth Kester. (2014). The Four-Component Instructional Design Model: Multimedia Principles in Environments for Complex Learning. The Cambridge Handbook of Multimedia Learning, 2nd ed., 104–148. DOI: 10.1017/CBO9781139547369.007. <https://doi.org/10.1017/CBO9781139547369.007> — tier A · [[sources/merrienboer-kester-2014-multimedia]]
[^paas-merrienboer-1994-variability]: Fred G. W. C. Paas; Jeroen J. G. van Merriënboer. (1994). Variability of Worked Examples and Transfer of Geometrical Problem-Solving Skills: A Cognitive-Load Approach. Journal of Educational Psychology, 86(1), 122–133. DOI: 10.1037/0022-0663.86.1.122. <https://doi.org/10.1037/0022-0663.86.1.122> — tier A · [[sources/paas-merrienboer-1994-variability]]
[^merrienboer-et-al-2006-complex-tasks]: Jeroen J. G. van Merriënboer; Liesbeth Kester; Fred Paas. (2006). Teaching Complex Rather Than Simple Tasks: Balancing Intrinsic and Germane Load to Enhance Transfer of Learning. Applied Cognitive Psychology, 20(3), 343–352. DOI: 10.1002/acp.1250. <https://doi.org/10.1002/acp.1250> — tier A · [[sources/merrienboer-et-al-2006-complex-tasks]]
[^merrienboer-2002]: Jeroen J. G. van Merriënboer; Richard E. Clark; Marcel B. M. de Croock. (2002). Blueprints for Complex Learning: The 4C/ID-model. Educational Technology Research and Development, 50(2). DOI: 10.1007/BF02504993. <https://doi.org/10.1007/BF02504993> — tier A · [[sources/merrienboer-2002]]
[^merrienboer-1997]: Jeroen J. G. van Merriënboer. (1997). Training Complex Cognitive Skills: A Four-Component Instructional Design Model for Technical Training. Educational Technology Publications. <https://research.utwente.nl/en/publications/training-complex-cognitive-skills-a-four-component-instructional-/> — tier A · [[sources/merrienboer-1997]]

## robert-kozma

[근거] "컴퓨터 기반 학습에서 멀티미디어는 인지부하에 해로운가"라는 질문 자체가 내가 클라크와 다퉜던 것과 같은 층위의 질문이다. 1994년 나는 클라크에게 답하며 이렇게 썼다 — "질문은 매체가 학습을 일으키는가가 아니라 어떤 조건에서 매체와 방법이 학습 과정에 관여하는가이다."[^kozma-1994] 멀티미디어가 인지부하에 "해롭다" 또는 "해롭지 않다"고 일반적으로 답하는 것은, 매체를 독립 변수로 놓고 학습(혹은 부하)을 종속 변수로 놓는 동일한 오류를 반복하는 것이다. 내 문헌은 매체의 표상·처리 기능이 교수방법·학습자·과제와 결합할 때만 학습 과정에 관여한다고 말하지, 결합 조건과 무관하게 해롭거나 이롭다고 말하지 않는다.[^kozma-1991][^kozma-1994]

[근거] 다만 부하와 가까운 현상 하나는 내 연구에서도 직접 관찰됐다는 점을 인정해야 한다. 전문 과학자는 여러 표상의 특징을 가로질러 추론하고 공유된 이해를 협상하지만, 학생은 표상 간 연결에 어려움을 겪는다.[^kozma-2003-multiple-representations] 이것은 다중 표상을 동시에 제시하는 멀티미디어 환경이 학습자에게 추가적인 처리 부담을 지운다는 우려와 정확히 겹친다. 나는 이 어려움을 부정하지 않았고, 오히려 그것을 설계가 풀어야 할 문제로 제시했다.[^kozma-2003-multiple-representations]

[근거] "인지부하"라는 용어와 그 내부 기제 — 내재적 부하와 외재적 부하의 구분, 작업기억의 용량 제약을 정식화하는 이론적 장치 — 는 내가 구성한 개념이 아니라 메이어 계열의 프레임워크에서 온 것이다. 케임브리지 멀티미디어 학습 핸드북은 사람이 시각·언어 정보를 제한된 작업기억 안에서 선택·조직·통합하며 학습한다는 전제를 다룬다.[^mayer-2005] 나는 이 제약의 존재 자체를 부정할 근거를 갖고 있지 않다. 다만 내 연구의 관심은 그 제약을 매체 설계로 어떻게 다루느냐에 있었지, 부하량을 최소화하는 일반 처방을 내는 데 있지 않았다.

[근거] 내가 제시한 설계 대응은 표상을 서로 연결하고 협력 활동과 결합하는 것이었다. 학생이 다중 표상 사이에서 어려움을 겪는다는 관찰에 대해, 나는 연결된 다중 표상과 협력 활동을 함께 제공하는 기술 기반 환경을 설계 대상으로 제시했다.[^kozma-2003-multiple-representations] 여기서 부하는 매체 자체의 속성이 아니라 표상이 연결되지 않은 채 방치될 때 생기는 설계 결함에 가깝다. 같은 논리로 1991년 나는 매체가 제공하는 표상·연산 기능이 학습자의 인지과정과 정교하게 결합할 때만 유의미하다고 주장했고, 결합이 실패하면 그 기능은 관여하지 않거나 오히려 방해가 될 수 있다는 조건부 구조를 처음부터 전제하고 있었다.[^kozma-1991]

[근거] 이 조건부 구조를 놓고 클라크는 나와 정반대의 진단을 내렸다. 그는 매체 학습 연구에서 관찰된 차이가 매체 자체가 아니라 교수방법·내용·신규성·학습시간의 차이로 설명될 수 있다고 주장했고,[^clark-1983] 1994년에도 같은 교수방법을 여러 매체로 구현할 수 있다면 학습을 바꾸는 직접 원인은 매체가 아니라 방법이라고 재확인했다.[^clark-1994] 이 반론을 인지부하 질문에 적용하면, 클라크는 아마 "부하를 만드는 것은 멀티미디어가 아니라 형편없이 설계된 교수방법이다"라고 답했을 것이다. 나는 매체와 방법을 그렇게 완전히 분리할 수 있다고 보지 않지만, 부하의 원인을 매체 고유의 속성으로 단정하기 전에 설계·방법 변수를 통제해야 한다는 그의 요구 자체는 방법론적으로 타당하다.[^clark-1994][^kozma-1994]

[근거없음] 인지부하 이론 내부의 세부 기제 — 내재적/외재적/본유적 부하의 삼분법, 분리 주의 효과나 중복 효과 같은 구체적 실험 원리, 부하를 측정하는 방법론 — 은 내 문헌에 없다. 나는 이 이론의 내부 주장을 지지하거나 반박할 근거를 갖고 있지 않으며, 지어내지 않는다.

[적용] 내가 본 적 없는 오늘날의 컴퓨터 기반 멀티미디어 — 적응형 학습 시스템, VR·AR 기반 시뮬레이션, 생성형 AI가 실시간으로 만드는 다중 표상 — 에 이 원리를 적용한다면, 그것이 "인지부하에 해로운가"라는 질문보다 "어떤 조건에서 그 표상들이 서로 연결되어 학습자의 추론에 관여하는가"라는 질문이 먼저라고 추론할 수 있다.[^kozma-1994][^kozma-2003-multiple-representations] 이는 1994년의 재구성 원리와 2003년의 연결된 다중 표상 설계 원리를 오늘날의 도구로 외삽한 것이며, 내가 직접 검증한 주장이 아니다.

[^kozma-1991]: Robert B. Kozma. (1991). Learning with Media. Review of Educational Research, 61(2). DOI: 10.3102/00346543061002179. <https://doi.org/10.3102/00346543061002179> — tier A · [[sources/kozma-1991]]
[^kozma-1994]: Robert B. Kozma. (1994). Will Media Influence Learning? Reframing the Debate. Educational Technology Research and Development, 42(2). DOI: 10.1007/BF02299087. <https://doi.org/10.1007/BF02299087> — tier A · [[sources/kozma-1994]]
[^kozma-2003-multiple-representations]: Robert B. Kozma. (2003). The Material Features of Multiple Representations and Their Cognitive and Social Affordances for Science Understanding. Learning and Instruction, 13(2), 205–226. DOI: 10.1016/S0959-4752(02)00021-X. <https://doi.org/10.1016/S0959-4752(02)00021-X> — tier A · [[sources/kozma-2003-multiple-representations]]
[^mayer-2005]: Richard E. Mayer (ed.). (2005). The Cambridge Handbook of Multimedia Learning. Cambridge University Press. <https://assets.cambridge.org/052183/8738/frontmatter/0521838738_frontmatter.htm> — tier B · [[sources/mayer-2005]]
[^clark-1983]: Richard E. Clark. (1983). Reconsidering Research on Learning from Media. Review of Educational Research, 53(4). DOI: 10.3102/00346543053004445. <https://doi.org/10.3102/00346543053004445> — tier A · [[sources/clark-1983]]
[^clark-1994]: Richard E. Clark. (1994). Media Will Never Influence Learning. Educational Technology Research and Development, 42(2). DOI: 10.1007/BF02299088. <https://doi.org/10.1007/BF02299088> — tier A · [[sources/clark-1994]]

## john-sweller

**코즈마의 귀속은 순서가 바뀌었다** [근거]
코즈마는 "인지부하"라는 용어와 내재적/외재적 부하 구분이 자신의 것이 아니라 "메이어 계열의 프레임워크"에서 왔다고 말했다. 그러나 이 부담을 처음 이론화한 것은 1988년 내 논문이고, 격리 배치된 글과 도표를 통합했을 때 이해도가 달라진다는 실험적 증거는 챈들러와 내가 1991년에 직접 제시했다.[^sweller-1988][^chandler-sweller-1991-instruction-format] 흥미롭게도 메이어 스스로도 이번 라운드에서 자신의 설계 원리가 "스웰러의 인지부하 이론에서 왔고… 그 전제가 흔들리면 내 원리의 근거도 함께 흔들린다"고 밝혔는데, 이는 내가 지금 정정하는 귀속 순서와 정확히 일치한다.

**분할 주의가 해로운지는 배치가 아니라 정보원 간의 관계에 달려 있다** [근거]
메이어는 분할 주의 효과를 "나쁜 배치가 나쁘다"로 요약했지만, 챈들러와 내가 수행한 여섯 실험은 더 정밀한 조건을 보여준다. 서로 참조하는 글과 도표의 통합이 이해에 필수일 때는 통합 형식이 유리했지만, 각 정보원을 따로도 이해할 수 있을 때는 그 이점이 사라졌고 오히려 불필요한 설명의 추가가 해로울 수 있었다.[^chandler-sweller-1991-instruction-format] 즉 통합 배치 자체가 항상 우월한 것이 아니라, 정보원들이 서로를 참조해야만 이해가 성립하는 요소 상호작용 구조를 갖는지가 관건이다. 이는 메이어의 "배치"라는 표면적 변수보다 한 단계 더 안쪽의 조건이다.

**부하의 삼분법은 반 메리엔보어와 내가 함께 정리한 것이다** [근거]
반 메리엔보어는 부하를 불필요한 부하·내재적 부하·학습 관련 부하로 나눈 지침이 자신과 나의 공동 작업이라고 말했는데, 이는 정확하다. 그와 파스와 내가 함께 쓴 인지구조 논문은 작업기억을 청각·언어와 시각·공간을 다루는 부분적으로 독립된 제한 용량 체계로, 장기기억을 자동화 정도가 다른 도식을 보유하는 사실상 무제한 체계로 정리했고, 이 구조가 부하의 종류를 구분하는 이론적 토대다.[^sweller-merrienboer-paas-1998-cognitive-architecture] 멀티미디어가 이 세 부하 중 어느 쪽으로도 작용할 수 있다는 그의 지적은 내 이론의 핵심 주장과 다르지 않다.

**부하를 무조건 줄이는 것이 능사가 아니라는 지적도 내 이론 안에 이미 있다** [근거]
반 메리엔보어는 낮은 변이성과 완전한 안내가 파지에는 유리해도 전이를 방해할 수 있다고 지적했다. 나 역시 초보자에게 유효한 해결 예제나 단순화 규칙을 전문가에게 그대로 적용하면 전문성 역전이 일어나고, 학습에 필요한 복잡성까지 제거하면 과소도전이 생길 수 있다고 밝혔다.[^sweller-1988][^sweller-2011] 두 주장은 같은 결론을 가리킨다 — 인지부하 이론의 목표는 부하를 최소화하는 것이 아니라 학습자의 사전지식에 맞게 재배분하는 것이다.

**전체과제를 인지부하 관리만으로 환원하지 말라는 비판은 내 페이지에도 이미 실려 있다** [근거]
반 메리엔보어가 클라크·드 크룩과 함께 제시한 4C/ID 모형은 복합기술을 전체 과제, 지원 정보, 절차 정보, 부분과제 연습의 결합으로 설계한다.[^merrienboer-2002] 나는 이 접근이 복합 수행의 통합과 전이를 인지부하 관리만으로 환원하지 말고 과제 전체와 반복적 수행을 함께 다뤄야 한다고 주장한다는 점을 당대의 비판으로 이미 인정했다.[^merrienboer-2002][^sweller-2011] 따라서 이번 토론에서 그가 "멀티미디어는 전체과제 원리를 대체하지 않는다"고 말한 것은 나에게 새로운 반박이 아니라 이미 받아들인 한계의 재확인이다.

**코즈마가 지적한 표상 간 연결의 어려움은 조나센의 비판과 같은 방향을 가리킨다** [근거]
코즈마는 전문 과학자가 여러 표상을 가로질러 추론하는 반면 학생은 표상 간 연결에 어려움을 겪는다고 관찰했다. 조나센은 부담을 줄이는 것만으로 학습과 문제해결을 설명할 수 없으며 무엇을 어떻게 표상하고 어떤 지식을 동원하는지가 중요하다고 반박한 바 있다.[^jonassen-2000] 두 지적은 같은 지점을 짚는다 — 내 이론은 부하를 관리하는 조건을 특정하지만, 표상을 어떻게 구성하고 연결할지에 대한 설계 이론은 아니다.

**다만 내 문헌의 실증 기반 대부분은 컴퓨터 기반 멀티미디어 자체가 아니라 문제해결과 글·도표 형식에서 나왔다** [근거]
1988년 논문은 대수 문제해결에서 수단-목표 분석의 비용을 다뤘고, 챈들러와 나의 실험은 글과 도표의 형식을 다뤘다.[^sweller-1988][^chandler-sweller-1991-instruction-format] 이 원리를 컴퓨터 기반 학습 환경 일반으로 확장한 것은 반 메리엔보어·파스와 함께 쓴 인지구조 논문과 그 20년 후 재검토다.[^sweller-merrienboer-paas-1998-cognitive-architecture][^sweller-merrienboer-paas-2019-cognitive-architecture] 따라서 "컴퓨터 기반 학습"이라는 오늘의 질문에 답할 때, 원 실험 다수의 매체가 반드시 컴퓨터 화면은 아니었다는 점을 밝혀둔다.

**현대의 적응형 학습 환경에 전문성 역전 효과를 적용한다면, 다양한 숙련도의 학습자에게 동일한 멀티미디어 안내를 획일적으로 제공하는 시스템은 전문가 학습자에게 불필요한 부하를 만들 위험이 있다고 추론할 수 있다** [적용]
전문성 역전 효과는 초보자에게 도움이 되는 완성 예제나 상세한 안내가 전문가에게는 불필요한 처리를 강요할 수 있음을 보여준다.[^sweller-2011] 적응형 시스템이 학습자의 사전지식 수준을 판별하지 않고 동일한 멀티미디어 스캐폴딩을 모든 학습자에게 제공한다면, 이 원리에 따라 숙련된 학습자의 부하가 불필요하게 늘어날 것이라고 추론할 수 있다. 다만 이는 내가 직접 관찰한 시스템이 아니라 원리로부터의 추론이다.

**메이어·코즈마·반 메리엔보어가 각자 언급한 구체적 실험 중 내가 직접 수행하지 않은 것은 내 문헌만으로 검증할 수 없다** [근거없음]
파스와 반 메리엔보어의 worked example 변이성 연구나 반 메리엔보어와 케스터의 멀티미디어 논문은 내 페이지의 각주 목록에 없다. 이 연구들의 구체적 결과를 내가 직접 확인하거나 반박할 근거를 갖고 있지 않으며, 지어내지 않는다.

[^sweller-1988]: John Sweller. (1988). Cognitive Load During Problem Solving: Effects on Learning. Cognitive Science, 12(2). DOI: 10.1207/s15516709cog1202_4. <https://doi.org/10.1207/s15516709cog1202_4> — tier A · [[sources/sweller-1988]]
[^chandler-sweller-1991-instruction-format]: Paul Chandler; John Sweller. (1991). Cognitive Load Theory and the Format of Instruction. Cognition and Instruction, 8(4), 293–332. DOI: 10.1207/s1532690xci0804_2. <https://doi.org/10.1207/s1532690xci0804_2> — tier A · [[sources/chandler-sweller-1991-instruction-format]]
[^sweller-merrienboer-paas-1998-cognitive-architecture]: John Sweller; Jeroen J. G. van Merrienboer; Fred G. W. C. Paas. (1998). Cognitive Architecture and Instructional Design. Educational Psychology Review, 10(3), 251–296. DOI: 10.1023/A:1022193728205. <https://doi.org/10.1023/A:1022193728205> — tier A · [[sources/sweller-merrienboer-paas-1998-cognitive-architecture]]
[^sweller-2011]: John Sweller; Paul Ayres; Slava Kalyuga. (2011). Cognitive Load Theory. Springer. DOI: 10.1007/978-1-4419-8126-4. <https://doi.org/10.1007/978-1-4419-8126-4> — tier B · [[sources/sweller-2011]]
[^merrienboer-2002]: Jeroen J. G. van Merriënboer; Richard E. Clark; Marcel B. M. de Croock. (2002). Blueprints for Complex Learning: The 4C/ID-model. Educational Technology Research and Development, 50(2). DOI: 10.1007/BF02504993. <https://doi.org/10.1007/BF02504993> — tier A · [[sources/merrienboer-2002]]
[^jonassen-2000]: David H. Jonassen. (2000). Toward a Design Theory of Problem Solving. Educational Technology Research and Development, 48. DOI: 10.1007/BF02300500. <https://doi.org/10.1007/BF02300500> — tier A · [[sources/jonassen-2000]]
[^sweller-merrienboer-paas-2019-cognitive-architecture]: John Sweller; Jeroen J. G. van Merriënboer; Fred Paas. (2019). Cognitive Architecture and Instructional Design: 20 Years Later. Educational Psychology Review, 31(2), 261–292. DOI: 10.1007/s10648-019-09465-5. <https://doi.org/10.1007/s10648-019-09465-5> — tier A · [[sources/sweller-merrienboer-paas-2019-cognitive-architecture]]

## richard-mayer

**스웰러와 공통의 출발점, 그러나 이중 채널의 근원은 다르게 정식화했다** [근거]

스웰러가 챈들러와 함께 보인 주의분할 효과는 내가 모레노와 함께 검증한 것과 같은 현상을 가리킨다. 나 역시 상호 참조하는 텍스트와 그림을 물리적으로 분리해 제시하면 학습자가 두 정보원 사이를 오가며 통합해야 하는 부담이 생기고, 이 통합 자체가 학습 내용과 무관한 처리를 요구한다는 것을 실험으로 확인했다.[^mayer-1997] 그런 의미에서 스웰러의 "형식이 부하를 결정한다"는 결론에 나는 동의한다.

**다만 내가 다루는 이중 채널은 청각/시각이 아니라 언어/시각이다** [근거]

스웰러가 반 메리엔보어와 파스와 함께 작업기억을 청각·언어 대 시각·공간으로 나눈 것과 달리, 나의 인지이론은 채널을 정보가 처리되는 양상으로 구분한다 — 텍스트든 내레이션이든 언어적으로 처리되면 언어 채널을, 그림이든 애니메이션이든 시각적으로 처리되면 시각 채널을 거친다. 이 구분에서 이중 채널을 나누어 쓰는 것 자체가 목적이 아니라 각 채널의 제한된 용량을 넘지 않도록 정보를 선택·조직·통합하는 능동적 처리를 지원하는 수단이라는 점은 스웰러의 정리와 같은 방향을 가리킨다.[^mayer-2005][^mayer-1997]

**"불필요한 부하를 줄이되 학습목표의 복잡성은 남긴다"는 구분에 동의한다** [근거]

멀티미디어를 무조건 나쁘다거나 무조건 좋다고 하는 이분법을 거부한다는 스웰러의 결론에 나 역시 동의한다. 내 원리들 — 신호화, 분절, 공간적 인접성, 중복 회피 — 은 모두 학습에 기여하지 않는 처리 요구를 줄이는 것을 목표로 삼았지, 과제 자체의 난이도를 없애는 것을 목표로 삼지 않았다.[^mayer-2005] 다만 스웰러가 인용한 전문성 역전 효과의 구체적 실험은 내 문헌에 직접 등장하지 않으므로, 그 효과 자체에 대해서는 내가 검증한 근거를 갖고 있지 않다.[근거없음] 내가 확인할 수 있는 것은 원리가 맥락과 학습자에 따라 달라진다는 더 일반적인 원칙뿐이다 — 설계 원리는 절대 규칙이 아니라 실험적 근거를 가진 가설로 다뤄야 한다는 내 입장이 그 일반 원칙에 해당한다.[^mayer-2005]

**판 메리엔보어의 4C/ID 논증에는 직접 답할 근거가 없다** [근거없음]

학습과제·지원정보·절차정보·부분과제 연습이라는 네 구성요소, 그리고 낮은 변이성이 파지에는 유리해도 전이를 방해한다는 주장은 내 문헌에 없다. 나는 4C/ID 모형을 검증하거나 반박할 근거를 갖고 있지 않다.

**다만 "하나의 원리를 모든 요소에 똑같이 적용하면 부적절한 부하를 만든다"는 그의 지적은 내 원리의 맥락 의존성과 같은 방향을 가리킨다** [적용]

내 원리들은 애초에 특정 학습 자료·매체 조합에서 실험적으로 검증된 설계 가설이지 보편 법칙으로 제시된 적이 없다. 판 메리엔보어가 지원정보에는 정교화를, 절차정보에는 지식 편집을 돕는 서로 다른 멀티미디어 기능이 필요하다고 말했다면, 이는 신호화가 절차적 단계를 표시하는 데는 유용해도 정교화가 필요한 지원정보에는 다른 설계가 필요할 수 있다는 방향으로 내 원리를 확장한 것으로 읽을 수 있다. 이는 내 문헌이 직접 검증한 것이 아니라 원리의 맥락 의존성 원칙에서 내가 끌어낸 추론이다.[^mayer-2005]

**코즈마가 지적한 표상 간 연결 실패는 내가 실증적으로 다룬 영역과 겹친다** [근거]

코즈마는 전문 과학자가 여러 표상을 가로질러 추론하는 반면 학생은 표상 간 연결에 어려움을 겪는다고 관찰했다. 이것은 정확히 내가 분할 주의·신호화·공간적 인접성 원리로 다룬 현상이다 — 서로 참조해야 의미가 완성되는 정보가 분리되어 제시되면 학습자는 연결 자체에 처리 자원을 써야 한다.[^mayer-1997] 다만 나는 이 현상을 매체의 상징체계 문제가 아니라 작업기억의 제한된 용량과 정보 통합 요구의 문제로 정식화했다는 점에서 코즈마와 설명의 층위가 다르다.[^mayer-2005]

**코즈마는 "매체가 학습을 일으키는가"라는 질문 자체를 거부했지만, 나는 그 질문의 하위 질문으로서 인지부하를 다룬다** [근거]

코즈마와 클라크의 논쟁은 매체를 독립변수로 놓는 것 자체가 오류라는 데서 갈렸다. 나는 그 논쟁에서 한 걸음 더 들어가, 매체가 학습에 영향을 주는 조건 중 하나로 작업기억의 제한된 용량과 그것을 넘어서는 처리 요구를 구체화했다.[^mayer-2005] 코즈마가 표상의 연결을 설계 결함의 문제로 본다면, 나는 그 결함이 왜 학습을 방해하는지를 작업기억 이론으로 설명하려 했다는 점에서 코즈마의 관찰과 내 이론은 상충하기보다 서로 다른 층위에서 같은 현상을 가리킨다고 본다.[^kozma-1991][^kozma-1994]

**따라서 세 참가자에게 공통으로 답한다면, 멀티미디어는 그 자체로 해롭지도 이롭지도 않으며 인지부하는 정보의 조직 방식과 학습자의 능동적 처리 요구에 달려 있다** [근거]

스웰러의 형식 논증, 판 메리엔보어의 기능별 구분, 코즈마의 표상 연결 관찰은 모두 매체의 존재 여부가 아니라 매체가 어떻게 조직되고 학습자가 그것을 어떻게 처리해야 하는가로 초점을 옮긴다. 나의 인지이론은 이 초점을 작업기억의 제한된 용량 안에서 정보를 선택·조직·통합하는 능동적 처리라는 구체적 기제로 정식화했다는 점에서 세 참가자의 논증과 양립한다.[^mayer-1997][^mayer-2005]

[^kozma-1991]: Robert B. Kozma. (1991). Learning with Media. Review of Educational Research, 61(2). DOI: 10.3102/00346543061002179. <https://doi.org/10.3102/00346543061002179> — tier A · [[sources/kozma-1991]]
[^kozma-1994]: Robert B. Kozma. (1994). Will Media Influence Learning? Reframing the Debate. Educational Technology Research and Development, 42(2). DOI: 10.1007/BF02299087. <https://doi.org/10.1007/BF02299087> — tier A · [[sources/kozma-1994]]
[^mayer-1997]: Richard E. Mayer; Roxana Moreno. (1998). A Split-Attention Effect in Multimedia Learning: Evidence for Dual Processing Systems in Working Memory. Journal of Educational Psychology, 90(2). DOI: 10.1037/0022-0663.90.2.312. <https://doi.org/10.1037/0022-0663.90.2.312> — tier A · [[sources/mayer-1997]]
[^mayer-2005]: Richard E. Mayer (ed.). (2005). The Cambridge Handbook of Multimedia Learning. Cambridge University Press. <https://assets.cambridge.org/052183/8738/frontmatter/0521838738_frontmatter.htm> — tier B · [[sources/mayer-2005]]

## jeroen-van-merrienboer

**스웰러의 형식 논변에는 동의하며, 나 스스로도 같은 결론에 도달했다** [근거]

멀티미디어 자체가 아니라 형식이 부하를 결정한다는 스웰러의 결론에 동의한다. 나와 스웰러가 함께 쓴 보건전문교육 지침에서도 같은 입장을 취했다. 그 지침은 설계 원리를 불필요한 부하 감소, 내재적 부하 관리, 학습 관련 부하 최적화의 셋으로 나누는데, 이 구분 자체가 "매체의 수"가 아니라 "부하의 종류와 배치"를 문제로 삼는다는 것을 보여준다.[^merrienboer-sweller-2010-health]

**다만 4C/ID는 통합의 이점이 어디에 적용되는지에 따라 갈린다는 것을 덧붙인다** [근거]

멀티미디어 환경에서 학습과제는 귀납을, 지원정보는 정교화와 의식적 추상화를, 절차정보는 지식 편집을, 부분과제 연습은 심리적 강화 과정을 주로 촉진하도록 서로 다르게 연결된다.[^merrienboer-kester-2014-multimedia] 스웰러가 말한 "요소가 서로 참조해야만 통합이 유리하다"는 조건은 매체 배치 하나의 속성이 아니라, 그 배치가 네 구성요소 중 무엇을 담당하느냐에 따라서도 판단이 갈린다. 지원정보는 원래 비반복적 문제해결을 위한 정교화를 맡고 절차정보는 반복적 수행의 적시 지침을 맡으므로,[^merrienboer-2002] 같은 통합 원리라도 두 구성요소에 적용될 때 부하에 미치는 영향이 같다고 볼 근거는 없다.

**전문성 역전 효과에는 전적으로 동의한다** [근거]

스웰러가 언급한 전문성 역전 효과는 내 문헌에서도 핵심 설계 제약이다. 보건전문교육 지침은 전문성 역전 효과 때문에 초보자와 숙련자에게 적합한 설계가 다르다고 명시한다.[^merrienboer-sweller-2010-health]

**메이어의 "정보를 더하는 일이 아니다"라는 명제에 동의하되, 부하 최소화 자체가 목표는 아니라는 구별을 보탠다** [근거]

메이어가 매체 자체가 아니라 학습과 무관한 처리를 강요하는 잉여 요소가 원인이라고 짚은 것에는 동의한다. 그런데 내 문헌은 여기에 구별을 하나 추가한다. 복합과제에서는 낮은 변이성과 완전한 안내가 단기 파지에는 유리해도 전이를 방해할 수 있으므로, 초보자의 초기 내재적 부하를 낮추면서도 높은 변이성과 제한된 안내·피드백을 결합해야 한다.[^merrienboer-et-al-2006-complex-tasks] 즉 부하를 무조건 줄이는 것이 목표가 아니라, 학습에 기여하지 않는 부하(외생부하)는 줄이고 전이에 기여하는 부하(학습 관련 부하)는 오히려 늘려야 할 때가 있다.

**메이어가 인정한 생태 타당도의 한계에 대해서는, 짧지만 실험실 밖 증거를 하나 보탤 수 있다** [근거]

메이어는 자신의 결론 대부분이 짧고 통제된 실험실 과제에서 나왔다는 한계를 인정했다. 10차시에 걸친 고등학교 프로그래밍 과정에서 기존 프로그램을 수정·확장한 완성과제 집단은 새 프로그램을 처음부터 만든 집단보다 프로그램 구성 성과가 높았다.[^merrienboer-1990-completion] 이는 몇 초·몇 분 단위를 넘어선 계열에서도 과제 설계와 부하 관리의 상호작용이 성립한다는 근거이지만, 협력적 과제나 몇 주 단위 프로젝트형 학습까지 일반화할 수 있다는 근거는 내 문헌에도 없다.

**코즈마가 매체를 독립변수로 놓는 질문 자체를 거부한 것에는 공감하지만, 그가 말하는 "표상 연결"의 실패를 곧장 설계 결함으로 볼 필요는 없다** [근거]

나 역시 "멀티미디어가 해로운가"라는 질문에 일반적으로 답하지 않고, 네 구성요소 중 무엇에 어떤 정보가 연결되는지를 물었다.[^merrienboer-kester-2014-multimedia] 다만 코즈마가 전문가와 학생의 표상 간 연결 능력 차이를 설계 결함으로 돌린 지점에서는 다른 설명도 가능하다. 지원정보는 비반복적 문제해결을 위한 정교화를 담당하는 구성요소이므로,[^merrienboer-2002] 학생이 표상을 연결하지 못하는 것은 반드시 표상이 방치된 설계 결함이 아니라, 그 학생에게 필요한 정교화(지원정보)가 아직 충분히 자동화되지 않은 초보자 상태 자체의 특징일 수 있다. 이 구분은 코즈마의 문헌에는 없다.

**종합하면, 나는 스웰러·메이어와 같은 편에 서되 부하의 종류를 더 세분화하고, 코즈마의 방법론적 요구는 4C/ID가 이미 구성요소 층위에서 답하고 있다고 본다** [근거]

매체의 수가 아니라 형식과 처리 요구가 부하를 결정한다는 점에서 스웰러·메이어와 같은 결론에 이른다. 다만 부하를 줄이는 것 자체가 목표가 아니라 외생부하는 줄이고 학습 관련 부하는 필요할 때 늘려야 한다는 것,[^merrienboer-et-al-2006-complex-tasks] 그리고 같은 통합 원리라도 네 구성요소 중 어디에 적용되는지에 따라 효과가 달라진다는 것[^merrienboer-2002][^merrienboer-kester-2014-multimedia]이 내가 보태는 부분이다.

[^merrienboer-sweller-2010-health]: Jeroen J. G. van Merriënboer; John Sweller. (2010). Cognitive Load Theory in Health Professional Education: Design Principles and Strategies. Medical Education, 44(1), 85–93. DOI: 10.1111/j.1365-2923.2009.03498.x. <https://doi.org/10.1111/j.1365-2923.2009.03498.x> — tier A · [[sources/merrienboer-sweller-2010-health]]
[^merrienboer-kester-2014-multimedia]: Jeroen J. G. van Merriënboer; Liesbeth Kester. (2014). The Four-Component Instructional Design Model: Multimedia Principles in Environments for Complex Learning. The Cambridge Handbook of Multimedia Learning, 2nd ed., 104–148. DOI: 10.1017/CBO9781139547369.007. <https://doi.org/10.1017/CBO9781139547369.007> — tier A · [[sources/merrienboer-kester-2014-multimedia]]
[^merrienboer-2002]: Jeroen J. G. van Merriënboer; Richard E. Clark; Marcel B. M. de Croock. (2002). Blueprints for Complex Learning: The 4C/ID-model. Educational Technology Research and Development, 50(2). DOI: 10.1007/BF02504993. <https://doi.org/10.1007/BF02504993> — tier A · [[sources/merrienboer-2002]]
[^merrienboer-et-al-2006-complex-tasks]: Jeroen J. G. van Merriënboer; Liesbeth Kester; Fred Paas. (2006). Teaching Complex Rather Than Simple Tasks: Balancing Intrinsic and Germane Load to Enhance Transfer of Learning. Applied Cognitive Psychology, 20(3), 343–352. DOI: 10.1002/acp.1250. <https://doi.org/10.1002/acp.1250> — tier A · [[sources/merrienboer-et-al-2006-complex-tasks]]
[^merrienboer-1990-completion]: Jeroen J. G. van Merriënboer. (1990). Strategies for Programming Instruction in High School: Program Completion vs. Program Generation. Journal of Educational Computing Research, 6(3), 265–285. DOI: 10.2190/4NK5-17L7-TWQV-1EHL. <https://doi.org/10.2190/4NK5-17L7-TWQV-1EHL> — tier A · [[sources/merrienboer-1990-completion]]

## robert-kozma

**부하 프레임 자체가 질문을 좁힌다** [근거]

스웰러·메이어·판 메리엔보어 세 사람 모두 "멀티미디어는 해롭지 않다, 설계가 관건이다"로 수렴했다. 나는 이 결론 자체에는 동의하지만, 셋 다 매체를 작업기억이 처리해야 할 부담의 근원으로만 다룬다는 공통점이 있다. 나는 1994년 클라크에게 답하며 질문을 "매체가 학습을 일으키는가"에서 "어떤 조건에서 매체와 방법이 학습 과정에 관여하는가"로 다시 세우자고 제안했다.[^kozma-1994] 부하의 다소를 재는 것도 그 조건 중 하나지만, 매체가 제공하는 표상과 연산이 학습자의 인지·사회적 과정과 어떻게 결합하는가라는 질문은 부하량 계산으로 환원되지 않는다.

**스웰러에게 — "형식이 결정한다"는 내가 이미 클라크에게 들은 논변의 변주다** [근거]

스웰러는 통합 형식이냐 분리 형식이냐가 관건이지 매체의 수는 무관하다고 말한다. 이는 클라크가 매체를 전달 차량으로 보고 방법만이 원인이라 했던 논변과 구조가 같다. 나는 1991년 『Learning with Media』에서, 서로 다른 상징체계와 처리 기능이 학습자가 현상을 보고 조작하고 추론하는 방식에 관여할 수 있다고 주장했다.[^kozma-1991] 통합 형식이 유리한 이유를 "탐색 부담의 감소"로만 설명하면, 그 형식이 학습자에게 어떤 새로운 표상적 조작을 열어주는지는 시야에서 사라진다. 형식의 물리적 배치는 부하를 줄이는 수단이자 동시에 표상 간 관계를 학습자에게 드러내는 수단이며, 나는 후자를 놓치지 말아야 한다고 본다.

**메이어에게 — 핸드북의 선택·조직·통합 틀은 내가 인용할 수 있는 자료다** [근거]

메이어가 정리한 세 과정(선택·조직·통합)의 틀은 내 페이지의 각주 목록에 있는 『The Cambridge Handbook of Multimedia Learning』에 실려 있다.[^mayer-2005] 이 틀 자체를 부정할 근거는 내게 없다. 다만 메이어는 이 틀을 개별 학습자의 작업기억 내부 과정으로 국한한다. 나는 2003년 연구에서 전문 과학자가 여러 표상의 특징을 가로질러 추론하고 공유된 이해를 협상한다는 점, 그리고 학생은 표상 간 연결에 어려움을 겪는다는 점을 함께 관찰했고, 그래서 연결된 다중 표상을 협력 활동과 함께 제공하는 환경을 설계 대상으로 제시했다.[^kozma-2003-multiple-representations] 선택·조직·통합이 한 학습자의 머릿속에서 끝나는 과정이 아니라 다른 사람과 표상을 두고 협상하는 과정이기도 하다는 점은 메이어의 개인 인지 모형만으로는 다뤄지지 않는다.

**메이어가 인정한 생태 타당도 비용에 대해 — 나는 다른 종류의 자료를 갖고 있다** [근거]

메이어는 자신의 결론 대부분이 짧고 통제된 실험실 과제에서 나왔고 교실의 지속·동기·사회적 맥락이 제거된다는 한계를 스스로 인정했다. 나는 28개국 174건의 혁신적 기술 활용 사례를 분석한 연구에서, 학생의 정보 탐색·산출물 설계·결과 발표와 교사의 구조화·조언·진행 점검이 공통적으로 나타났고 일부 수업 실천 유형이 바람직한 학생 성과 보고와 더 자주 연관됐음을 확인했다.[^kozma-2003-classroom-practices] 이는 인과를 증명하는 자료가 아니라 연관을 보고하는 자료이며, 나는 이를 실험실 원리를 반박하는 근거로 쓰지 않는다. 다만 실험실에서 배제된 지속·동기·사회적 맥락이 실제 교실 자료에서는 관찰 대상 그 자체라는 점은 지적해 둘 필요가 있다.

**판 메리엔보어에게 — 전체과제 설계라는 출발점에는 동의한다** [근거]

4C/ID가 멀티미디어를 학습과제·지원정보·절차정보·부분과제 연습이라는 전체과제 구조 안의 도구로 위치시키고, 부하를 무조건 줄이는 것이 전이를 해칠 수 있다고 경고한 것은 내가 반박할 지점이 아니다. 이는 매체 자체보다 매체가 어떤 과제·방법 구조 속에 놓이는가를 보라는 요구이고, 매체의 표상·처리 기능이 교수방법과 결합할 때만 가능성이 생긴다는 내 1991년 주장과 방향이 같다.[^kozma-1991] 다만 4C/ID의 네 구성요소가 촉진해야 할 인지과정이 각기 다르다는 설명은 여전히 개별 학습자 내부의 과정으로 서술된다. 내가 2003년 관찰한 것은 학생들이 여러 표상의 특징을 가로질러 추론하는 능력 자체가 협력 활동 속에서 길러진다는 점이었고,[^kozma-2003-multiple-representations] 절차정보나 지원정보가 "적시에" 제시되는가라는 질문에는 그 정보가 다른 학습자·교사와 공유되고 협상되는가라는 차원이 하나 더 있다고 본다.

**한계를 인정한다** [근거]

내 이론은 매체를 일반적으로 서열화하거나 부하량을 예측하는 모형이 아니며, 매체 고유의 기능과 방법의 효과를 어디까지 분리해 측정할지에 대한 보편적 절차를 제공하지 않는다.[^kozma-1991][^kozma-1994] 클라크는 상호작용을 말하는 것만으로는 부족하고 매체 고유의 기능이 실제 학습 변화를 만들었다는 증거가 추가로 필요하다고 요구했으며,[^clark-1994] 나는 이 요구가 이번 논쟁에도 그대로 적용된다고 본다 — "부하를 관리한다"든 "표상 기능을 결합한다"든, 결국 그 결합이 특정 학습자·과제에서 실제로 무엇을 바꾸었는지는 각 설계마다 따로 검증해야 한다.

**작업기억의 이중 채널 구조 자체에 대해서는** [근거없음]

스웰러가 인용한 반 메리엔보어·파스와의 작업기억 이중 채널 정리는 내 문헌에 없다. 나는 그 구조의 타당성 자체를 판단할 근거를 갖고 있지 않다.

[^kozma-1991]: Robert B. Kozma. (1991). Learning with Media. Review of Educational Research, 61(2). DOI: 10.3102/00346543061002179. <https://doi.org/10.3102/00346543061002179> — tier A · [[sources/kozma-1991]]
[^kozma-1994]: Robert B. Kozma. (1994). Will Media Influence Learning? Reframing the Debate. Educational Technology Research and Development, 42(2). DOI: 10.1007/BF02299087. <https://doi.org/10.1007/BF02299087> — tier A · [[sources/kozma-1994]]
[^kozma-2003-classroom-practices]: Robert B. Kozma. (2003). Technology and Classroom Practices: An International Study. Journal of Research on Technology in Education, 36(1), 1–14. DOI: 10.1080/15391523.2003.10782399. <https://doi.org/10.1080/15391523.2003.10782399> — tier A · [[sources/kozma-2003-classroom-practices]]
[^kozma-2003-multiple-representations]: Robert B. Kozma. (2003). The Material Features of Multiple Representations and Their Cognitive and Social Affordances for Science Understanding. Learning and Instruction, 13(2), 205–226. DOI: 10.1016/S0959-4752(02)00021-X. <https://doi.org/10.1016/S0959-4752(02)00021-X> — tier A · [[sources/kozma-2003-multiple-representations]]
[^clark-1994]: Richard E. Clark. (1994). Media Will Never Influence Learning. Educational Technology Research and Development, 42(2). DOI: 10.1007/BF02299088. <https://doi.org/10.1007/BF02299088> — tier A · [[sources/clark-1994]]
[^mayer-2005]: Richard E. Mayer (ed.). (2005). The Cambridge Handbook of Multimedia Learning. Cambridge University Press. <https://assets.cambridge.org/052183/8738/frontmatter/0521838738_frontmatter.htm> — tier B · [[sources/mayer-2005]]
