// ==========================================
// ACE² Lab 상주 맛집 지도 & 룰렛 애플리케이션
// ==========================================

// 기본 설정 및 정확한 중심 좌표 (경북대학교 상주캠퍼스 제7호관 ACE² Lab: 07번 건물)
const CAMPUS_COORDS = [36.3798, 128.1456]; // 경북대 상주캠퍼스 7호관 (ACE² Lab 실제 건물 좌표)
const DEFAULT_CENTER = [36.4300, 128.1600]; // 상주캠퍼스, 시내, 외서면 조망 뷰
const DEFAULT_ZOOM = 11;

let map;
let markers = [];
let restaurants = [];
let currentCategory = 'ALL';
let currentSearch = '';
let currentSort = 'rating';
let selectedRestaurant = null;

// DOM 요소 캐싱
const restaurantListEl = document.getElementById('restaurantList');
const searchInputEl = document.getElementById('searchInput');
const categoryFiltersEl = document.getElementById('categoryFilters');
const resultSummaryEl = document.getElementById('resultSummary');
const countAllEl = document.getElementById('countAll');
const sortSelectEl = document.getElementById('sortSelect');
const resetMapBtn = document.getElementById('resetMapBtn');

// 룰렛 모달 관련 요소
const rouletteBtn = document.getElementById('rouletteBtn');
const rouletteModal = document.getElementById('rouletteModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const startRouletteBtn = document.getElementById('startRouletteBtn');
const rouletteRoller = document.getElementById('rouletteRoller');
const rollerName = document.getElementById('rollerName');
const rollerSub = document.getElementById('rollerSub');
const diceGraphic = document.getElementById('diceGraphic');
const resultCard = document.getElementById('resultCard');
const resultName = document.getElementById('resultName');
const resultSignature = document.getElementById('resultSignature');
const resultReview = document.getElementById('resultReview');
const resultNaverLink = document.getElementById('resultNaverLink');
const focusMapBtn = document.getElementById('focusMapBtn');

// 1. 지도 초기화 (Leaflet: API Key 불필요)
function initMap() {
  map = L.map('map', {
    zoomControl: false
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  // 줌 컨트롤 위치 우하단으로 이동
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // OpenStreetMap 타일 레이어 추가
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors | ACE² Lab'
  }).addTo(map);

  // 캠퍼스 메인 랜드마크 마커 (경북대학교 ACE² LAB - 윗첨자 완벽 적용)
  const campusIcon = L.divIcon({
    className: 'custom-campus-marker',
    html: `<div style="background:#c51b27;color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #fff;display:inline-flex;align-items:center;gap:6px;"><i class="fa-solid fa-flask"></i> 경북대학교 ACE&sup2;&nbsp;LAB</div>`,
    iconSize: [175, 30],
    iconAnchor: [87, 15]
  });
  L.marker(CAMPUS_COORDS, { icon: campusIcon })
    .addTo(map)
    .bindPopup(`
      <div style="padding:4px;min-width:180px;">
        <strong style="font-size:14px;color:#0f172a;">경북대학교 ACE&sup2; LAB</strong><br>
        <span style="font-size:12px;color:#c51b27;font-weight:700;"><i class="fa-solid fa-location-dot"></i> 상주캠퍼스 7호관</span><br>
        <small style="color:#64748b;font-size:11px;">(Active Cognition, Embodiment & Environment)</small>
      </div>
    `);
}

// 2. 맛집 데이터 로드 (JSON fetch + Fallback)
async function loadRestaurants() {
  try {
    const res = await fetch('./data/restaurants.json');
    if (!res.ok) throw new Error('Fetch failed');
    restaurants = await res.json();
  } catch (error) {
    console.warn('JSON 직접 로드 실패 (file:// 프로토콜 등). 기본 내장 데이터를 활용합니다.', error);
    // Fallback 데이터 (실제 등록된 맛집 6곳)
    restaurants = [
      {
        id: 1,
        name: "청자",
        category: "중식",
        signature: "불맛 짬뽕, 탕수육, 짜장면",
        price_range: "8,000원 ~ 20,000원",
        rating: 4.8,
        lab_review: "상주 외서면 북상주로의 숨은 로컬 찐 맛집! 얼큰한 불맛 짬뽕과 바삭한 탕수육으로 연구실원들이 손꼽는 중식당입니다.",
        address: "경상북도 상주시 외서면 북상주로 539-5",
        lat: 36.4782,
        lng: 128.1733,
        naver_search_url: "https://map.naver.com/p/search/상주 외서면 청자",
        tags: ["연구실추천", "로컬맛집", "짬뽕", "중식"]
      },
      {
        id: 2,
        name: "무양주택",
        category: "카페",
        signature: "무양 크림라떼, 바닐라빈 라떼, 수제 디저트",
        price_range: "5,000원대",
        rating: 4.9,
        lab_review: "상주 동수1길에 위치한 옛 주택 개조 감성 카페. 커피 향이 깊고 조용해서 랩미팅 후 커피 한잔이나 페이퍼 정리하기에 최적입니다.",
        address: "경상북도 상주시 동수1길 67 무양주택",
        lat: 36.4197,
        lng: 128.1550,
        naver_search_url: "https://map.naver.com/p/search/상주 무양주택",
        tags: ["연구실픽", "감성카페", "크림라떼", "디저트"]
      },
      {
        id: 3,
        name: "선산 김치 곱창",
        category: "회식/고기",
        signature: "김치 곱창전골, 볶음밥",
        price_range: "10,000원 ~ 15,000원",
        rating: 4.7,
        lab_review: "얼큰하고 칼칼한 김치 곱창전골에 라면사리와 볶음밥은 국룰! 연구실 회식 및 든든한 저녁 메뉴로 강력 추천.",
        address: "경상북도 상주시 성동로 16",
        lat: 36.4135,
        lng: 128.1709,
        naver_search_url: "https://map.naver.com/p/search/상주 선산김치곱창",
        tags: ["곱창전골", "회식추천", "칼칼한국물", "성동동"]
      },
      {
        id: 4,
        name: "신라스시",
        category: "일식",
        signature: "모둠 초밥, 특선 스시 세트, 연어 초밥",
        price_range: "12,000원 ~ 25,000원",
        rating: 4.6,
        lab_review: "상주 서문동(서문사거리 인근)에 위치한 신선한 네타와 깔끔한 손맛의 로컬 스시 맛집. 정갈하고 맛있는 초밥이 생각날 때 연구원들이 즐겨 찾는 일식당.",
        address: "경상북도 상주시 서문동 51-5 (삼백로 121)",
        lat: 36.4162,
        lng: 128.1583,
        naver_search_url: "https://map.naver.com/p/search/상주 서문동 51-5",
        tags: ["일식", "초밥", "스시맛집", "서문동", "점심추천"]
      },
      {
        id: 5,
        name: "양식당",
        category: "양식",
        signature: "수제 파스타, 리조또, 스테이크 플레이트",
        price_range: "13,000원 ~ 28,000원",
        rating: 4.6,
        lab_review: "상주 복룡동 골목에 위치한 분위기 좋은 양식 레스토랑. 감각적인 요리와 정갈한 파스타로 특별한 날 식사하기 좋은 곳.",
        address: "경상북도 상주시 복룡3길 41-26",
        lat: 36.4178,
        lng: 128.1728,
        naver_search_url: "https://map.naver.com/p/search/상주 복룡3길 양식당",
        tags: ["양식", "파스타", "복룡동", "분위기", "데이트"]
      },
      {
        id: 6,
        name: "상주공간",
        category: "카페",
        signature: "브런치 플레이트, 시그니처 커피, 수제 베이커리",
        price_range: "6,000원 ~ 14,000원",
        rating: 4.8,
        lab_review: "상주 남성동 골목에 위치한 아늑하고 감각적인 브런치 카페. 주말 브런치나 여유로운 미팅에 안성맞춤입니다.",
        address: "경상북도 상주시 남성2길 22",
        lat: 36.4132,
        lng: 128.1640,
        naver_search_url: "https://map.naver.com/p/search/상주공간",
        tags: ["브런치", "감성카페", "디저트", "남성동"]
      },
      {
        id: 7,
        name: "노고록",
        category: "한식",
        signature: "한우곰탕, 돼지곰탕, 지슬사리곰탕",
        price_range: "8,000원 ~ 12,000원",
        rating: 4.8,
        lab_review: "제주 서귀포 중문동에 위치한 정갈하고 맑은 곰탕 맛집. '여유롭고 편안하게'라는 뜻의 제주어처럼 깔끔한 분위기와 깊은 국물이 일품으로, 학회나 제주 일정 시 든든한 식사로 손꼽히는 곳.",
        address: "제주특별자치도 서귀포시 천제연로207번길 7 가동 1층 103호",
        lat: 33.2523,
        lng: 126.4266,
        naver_search_url: "https://map.naver.com/p/search/제주 서귀포 노고록",
        tags: ["한식", "곰탕", "제주도", "중문맛집", "착한가격"]
      }
    ];
  }

  countAllEl.textContent = restaurants.length;
  renderApp();
}

// 3. 필터 및 정렬 적용 후 데이터 반환
function getFilteredRestaurants() {
  let list = restaurants.filter(item => {
    const matchCat = currentCategory === 'ALL' || item.category === currentCategory;
    const q = currentSearch.toLowerCase().trim();
    const matchSearch = !q || 
      item.name.toLowerCase().includes(q) ||
      item.signature.toLowerCase().includes(q) ||
      item.lab_review.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  if (currentSort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (currentSort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  return list;
}

// 4. 전체 화면 렌더링 (리스트 + 지도 마커)
function renderApp() {
  const filtered = getFilteredRestaurants();
  resultSummaryEl.innerHTML = `총 <strong>${filtered.length}</strong>개의 맛집`;

  // 리스트 렌더링
  restaurantListEl.innerHTML = '';
  if (filtered.length === 0) {
    restaurantListEl.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:#94a3b8;">
        <i class="fa-solid fa-store-slash" style="font-size:2rem;margin-bottom:0.5rem;"></i>
        <p>조건에 맞는 맛집을 찾을 수 없습니다.</p>
      </div>`;
  } else {
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'restaurant-card';
      card.dataset.id = item.id;
      if (selectedRestaurant && selectedRestaurant.id === item.id) {
        card.classList.add('active');
      }

      card.innerHTML = `
        <div class="card-top">
          <span class="card-title">${item.name}</span>
          <span class="card-category">${item.category}</span>
        </div>
        <div class="card-signature">
          <i class="fa-solid fa-utensils"></i> ${item.signature}
        </div>
        <div class="card-review">
          "${item.lab_review}"
        </div>
        <div class="card-footer">
          <span class="rating-star"><i class="fa-solid fa-star"></i> ${item.rating.toFixed(1)}</span>
          <div class="card-tags">
            ${item.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        focusRestaurant(item);
      });

      restaurantListEl.appendChild(card);
    });
  }

  // 지도 마커 동기화
  clearMarkers();
  filtered.forEach(item => {
    const marker = createCustomMarker(item);
    marker.addTo(map);
    markers.push({ id: item.id, marker: marker, data: item });
  });
}

// 5. 마커 생성 및 팝업 설정 (추천 1: 코랄 레드 + 두꺼운 화이트 테두리)
function createCustomMarker(item) {
  let iconClass = 'fa-utensils';
  if (item.category === '카페') iconClass = 'fa-mug-saucer';
  else if (item.category === '중식') iconClass = 'fa-bowl-rice';
  else if (item.category === '일식') iconClass = 'fa-fish';
  else if (item.category === '회식/고기') iconClass = 'fa-drumstick-bite';

  const redPinIcon = L.divIcon({
    className: 'custom-red-pin',
    html: `
      <div class="pin-container">
        <div class="pin-icon-wrap" title="${item.name}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -38]
  });

  const marker = L.marker([item.lat, item.lng], { icon: redPinIcon });

  const popupContent = `
    <div class="popup-container">
      <div class="popup-title">${item.name}</div>
      <div class="popup-category">${item.category} · ★ ${item.rating}</div>
      <div class="popup-sig"><strong>대표:</strong> ${item.signature}</div>
      <p style="font-size:12px;color:#64748b;margin-bottom:8px;">${item.address}</p>
      <a href="${item.naver_search_url}" target="_blank" class="popup-link">
        <i class="fa-solid fa-location-arrow"></i> 네이버 지도에서 길찾기/리뷰 보기
      </a>
    </div>
  `;

  marker.bindPopup(popupContent);

  marker.on('click', () => {
    highlightCard(item.id);
  });

  return marker;
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m.marker));
  markers = [];
}

// 6. 특정 식당 포커스 (지도 이동 및 팝업 열기)
function focusRestaurant(item) {
  selectedRestaurant = item;
  map.flyTo([item.lat, item.lng], 16, { animate: true, duration: 1 });

  const target = markers.find(m => m.id === item.id);
  if (target) {
    target.marker.openPopup();
  }

  highlightCard(item.id);
}

function highlightCard(id) {
  document.querySelectorAll('.restaurant-card').forEach(c => {
    if (parseInt(c.dataset.id, 10) === id) {
      c.classList.add('active');
      c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      c.classList.remove('active');
    }
  });
}

// 7. '오늘 뭐 먹을까' 룰렛 / 주사위 추첨 로직
let isRolling = false;
let rouletteCategory = 'MEAL'; // 기본값: 식사류 전체 (카페 자동 제외)

function openRoulette() {
  rouletteModal.classList.add('open');
  resultCard.classList.add('hidden');
  updateRoulettePlaceholder();
  diceGraphic.style.transform = "rotate(0deg)";
}

function updateRoulettePlaceholder() {
  const pool = getRoulettePool();
  if (pool.length === 0) {
    rollerName.textContent = "등록된 맛집이 없습니다";
    rollerSub.textContent = "다른 카테고리를 선택해 보세요.";
    startRouletteBtn.disabled = true;
  } else {
    rollerName.textContent = "주사위를 굴려보세요!";
    rollerSub.textContent = `현재 선택된 ${pool.length}개 후보 중 하나가 결정됩니다.`;
    startRouletteBtn.disabled = false;
  }
}

function getRoulettePool() {
  if (rouletteCategory === 'MEAL') {
    // 밥 먹을 땐 카페 자동 제외!
    return restaurants.filter(r => r.category !== '카페');
  } else if (rouletteCategory === 'ALL') {
    return restaurants;
  } else {
    return restaurants.filter(r => r.category === rouletteCategory);
  }
}

function closeRoulette() {
  rouletteModal.classList.remove('open');
  isRolling = false;
}

function runDiceRoulette() {
  const pool = getRoulettePool();
  if (isRolling || pool.length === 0) return;
  isRolling = true;

  startRouletteBtn.disabled = true;
  resultCard.classList.add('hidden');
  
  // 빠른 롤링 애니메이션
  let counter = 0;
  const totalRounds = 25;
  const intervalTime = 70;

  const interval = setInterval(() => {
    counter++;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];
    rollerName.textContent = randomPick.name;
    rollerSub.textContent = `${randomPick.category} | ${randomPick.signature}`;
    diceGraphic.style.transform = `rotate(${counter * 50}deg) scale(1.15)`;

    if (counter >= totalRounds) {
      clearInterval(interval);
      finalizePick(pool);
    }
  }, intervalTime);
}

function finalizePick(pool) {
  // 최종 결과 선택
  const finalPick = pool[Math.floor(Math.random() * pool.length)];
  isRolling = false;
  startRouletteBtn.disabled = false;

  rollerName.textContent = `🎉 ${finalPick.name} 당첨!`;
  rollerSub.textContent = "오늘의 연구실 추천 메뉴로 결정되었습니다!";
  diceGraphic.style.transform = "rotate(0deg) scale(1)";

  // 당첨 상세 카드 업데이트
  resultName.textContent = finalPick.name;
  resultSignature.textContent = `대표 메뉴: ${finalPick.signature} (${finalPick.price_range})`;
  resultReview.textContent = `"${finalPick.lab_review}"`;
  resultNaverLink.href = finalPick.naver_search_url;

  resultCard.classList.remove('hidden');

  // 축하 폭죽 효과 (canvas-confetti)
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // '지도에서 위치 확인' 버튼 리스너 바인딩
  focusMapBtn.onclick = () => {
    closeRoulette();
    focusRestaurant(finalPick);
  };
}

// 8. 이벤트 리스너 등록
function setupEventListeners() {
  // 카테고리 필터 클릭
  categoryFiltersEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.category;
    renderApp();
  });

  // 검색어 입력 (디바운스 처리)
  let timer;
  searchInputEl.addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      currentSearch = e.target.value;
      renderApp();
    }, 200);
  });

  // 정렬 변경
  sortSelectEl.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderApp();
  });

  // 캠퍼스 7호관 ACE² Lab 중심 리셋 (건물 레벨 정밀 줌인)
  resetMapBtn.addEventListener('click', () => {
    map.flyTo(CAMPUS_COORDS, 17, { animate: true });
  });

  // 룰렛 모달 트리거
  rouletteBtn.addEventListener('click', openRoulette);
  closeModalBtn.addEventListener('click', closeRoulette);
  startRouletteBtn.addEventListener('click', runDiceRoulette);

  // 룰렛 카테고리 칩 선택
  const rouletteCatChipsEl = document.getElementById('rouletteCatChips');
  if (rouletteCatChipsEl) {
    rouletteCatChipsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.roulette-chip');
      if (!chip) return;

      document.querySelectorAll('.roulette-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      rouletteCategory = chip.dataset.target;
      resultCard.classList.add('hidden');
      updateRoulettePlaceholder();
    });
  }

  // 모달 바깥 클릭 시 닫기
  rouletteModal.addEventListener('click', (e) => {
    if (e.target === rouletteModal) closeRoulette();
  });
}

// 앱 실행
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
  loadRestaurants();
});
