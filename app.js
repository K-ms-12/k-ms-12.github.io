// ==========================================
// ACE² Lab 상주 맛집 지도 & 룰렛 애플리케이션
// ==========================================

// 기본 설정 및 중심 좌표 (경북대학교 상주캠퍼스 및 상주 시내 중심)
const CAMPUS_COORDS = [36.3888, 128.1633]; // 상주캠퍼스
const DEFAULT_CENTER = [36.4100, 128.1600]; // 상주 시내와 캠퍼스 중간 뷰
const DEFAULT_ZOOM = 13;

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

  // 캠퍼스 메인 랜드마크 마커 (경북대 시그니처 레드)
  const campusIcon = L.divIcon({
    className: 'custom-campus-marker',
    html: `<div style="background:#b91c1c;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><i class="fa-solid fa-graduation-cap"></i> 경북대 상주캠퍼스</div>`,
    iconSize: [120, 24],
    iconAnchor: [60, 12]
  });
  L.marker(CAMPUS_COORDS, { icon: campusIcon })
    .addTo(map)
    .bindPopup('<strong>경북대학교 상주캠퍼스</strong><br>ACE² Lab 연구실 위치');
}

// 2. 맛집 데이터 로드 (JSON fetch + Fallback)
async function loadRestaurants() {
  try {
    const res = await fetch('./data/restaurants.json');
    if (!res.ok) throw new Error('Fetch failed');
    restaurants = await res.json();
  } catch (error) {
    console.warn('JSON 직접 로드 실패 (file:// 프로토콜 등). 기본 내장 데이터를 활용합니다.', error);
    // file:// 로 직접 더블클릭해서 열 때를 위한 Fallback 데이터
    restaurants = [
      {
        id: 1, name: "부자돼지", category: "회식/고기", signature: "꽈리고추 생삼겹살",
        price_range: "15,000원대", rating: 4.8, lab_review: "교수님 및 연구실원 만장일치 회식 명소! 꽈리고추와 삼겹살의 조합이 일품입니다.",
        address: "경북 상주시 삼백로 159", lat: 36.4132, lng: 128.1605,
        naver_search_url: "https://map.naver.com/p/search/상주 부자돼지", tags: ["연구실추천", "회식", "삼겹살"]
      },
      {
        id: 2, name: "고려분식", category: "분식", signature: "수제 군만두, 매콤 쫄면",
        price_range: "6,000원 ~ 8,000원", rating: 4.6, lab_review: "상주 중앙시장 40년 전통의 노포. 바삭한 군만두와 새콤달콤 쫄면은 점심 힐링 메뉴입니다.",
        address: "경북 상주시 중앙시장길 29", lat: 36.4158, lng: 128.1631,
        naver_search_url: "https://map.naver.com/p/search/상주 고려분식", tags: ["가성비", "시장맛집", "점심추천"]
      },
      {
        id: 3, name: "명실상감한우", category: "한식", signature: "상감한우탕 (일일 한정)",
        price_range: "14,000원 ~ 30,000원", rating: 4.7, lab_review: "상주 최고 품질의 한우 전문점. 든든한 점심 특선 갈비탕과 랩미팅 후 점심으로 강력 추천.",
        address: "경북 상주시 영남제일로 1119-9", lat: 36.4258, lng: 128.1725,
        naver_search_url: "https://map.naver.com/p/search/상주 명실상감한우", tags: ["연구실픽", "몸보신", "한우"]
      },
      {
        id: 4, name: "서보칼국수", category: "한식", signature: "손칼국수, 배추전",
        price_range: "7,000원대", rating: 4.5, lab_review: "맑고 깊은 국물의 전통 경상도식 누름국수. 비 오는 날 연구실 동기들과 가기 딱 좋습니다.",
        address: "경북 상주시 상산로 247", lat: 36.4120, lng: 128.1560,
        naver_search_url: "https://map.naver.com/p/search/상주 서보칼국수", tags: ["가성비", "비오는날", "칼국수"]
      },
      {
        id: 5, name: "무양주택", category: "카페", signature: "무양 크림라떼, 수제 디저트",
        price_range: "5,000원대", rating: 4.7, lab_review: "오래된 옛 주택을 개조한 감성 카페. 논문 읽거나 조용히 아이디어 회의하기 좋은 아늑한 공간입니다.",
        address: "경북 상주시 무양동 38-1", lat: 36.4180, lng: 128.1528,
        naver_search_url: "https://map.naver.com/p/search/상주 무양주택", tags: ["연구실미팅", "디저트", "감성카페"]
      },
      {
        id: 6, name: "상주캠퍼스 대학가 밥집 (가장골)", category: "한식", signature: "제육볶음 정식, 김치찌개",
        price_range: "8,000원대", rating: 4.4, lab_review: "경북대 상주캠 정문 인근. 넉넉한 인심과 무한리필 밥/반찬으로 대학원생 지갑을 지켜주는 든든한 밥집.",
        address: "경북 상주시 경상대로 2560 (대학가)", lat: 36.3892, lng: 128.1639,
        naver_search_url: "https://map.naver.com/p/search/경북대 상주캠퍼스 맛집", tags: ["캠퍼스인근", "점심추천", "가성비"]
      },
      {
        id: 7, name: "남산가든", category: "한식", signature: "석쇠구이, 고추장불고기",
        price_range: "11,000원대", rating: 4.6, lab_review: "불향 가득한 석쇠 불고기 쌈밥. 타지에서 손님이나 가족이 방문했을 때 모시고 가기 좋습니다.",
        address: "경북 상주시 남산공원길 45", lat: 36.4020, lng: 128.1680,
        naver_search_url: "https://map.naver.com/p/search/상주 남산가든", tags: ["연구실픽", "불고기", "손님대접"]
      },
      {
        id: 8, name: "영화루", category: "중식", signature: "해물 짬뽕, 탕수육",
        price_range: "8,000원 ~ 12,000원", rating: 4.3, lab_review: "불맛 가득한 얼큰한 짬뽕으로 밤샘 연구 다음 날 해장하기에 최적화된 중식당.",
        address: "경북 상주시 중앙로 112", lat: 36.4140, lng: 128.1590,
        naver_search_url: "https://map.naver.com/p/search/상주 영화루", tags: ["해장", "짬뽕", "점심추천"]
      },
      {
        id: 9, name: "파스타부오노 상주점", category: "양식", signature: "봉골레 파스타, 시카고 피자",
        price_range: "9,000원 ~ 14,000원", rating: 4.2, lab_review: "음료 무료 제공과 부담 없는 가격으로 대학생/대학원생들에게 인기 있는 파스타 전문점.",
        address: "경북 상주시 상산로 260", lat: 36.4130, lng: 128.1580,
        naver_search_url: "https://map.naver.com/p/search/파스타부오노 상주점", tags: ["가성비", "파스타", "양식"]
      },
      {
        id: 10, name: "카페 플랫하우스", category: "카페", signature: "핸드드립 스페셜티, 바스크 치즈케이크",
        price_range: "5,000원대", rating: 4.7, lab_review: "조용하고 깔끔한 인테리어로 집중해서 코딩하거나 페이퍼 정리하기에 최적의 공간.",
        address: "경북 상주시 삼백로 102", lat: 36.4110, lng: 128.1620,
        naver_search_url: "https://map.naver.com/p/search/상주 플랫하우스", tags: ["조용한카페", "핸드드립", "스터디"]
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

// 5. 마커 생성 및 팝업 설정
function createCustomMarker(item) {
  const marker = L.marker([item.lat, item.lng]);

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

function openRoulette() {
  rouletteModal.classList.add('open');
  resultCard.classList.add('hidden');
  rollerName.textContent = "주사위를 굴려보세요!";
  rollerSub.textContent = "ACE² Lab 선정 맛집 중 하나가 결정됩니다.";
  diceGraphic.style.transform = "rotate(0deg)";
}

function closeRoulette() {
  rouletteModal.classList.remove('open');
  isRolling = false;
}

function runDiceRoulette() {
  if (isRolling || restaurants.length === 0) return;
  isRolling = true;

  startRouletteBtn.disabled = true;
  resultCard.classList.add('hidden');
  
  // 빠른 롤링 애니메이션
  let counter = 0;
  const totalRounds = 25;
  const intervalTime = 70;

  const interval = setInterval(() => {
    counter++;
    const randomPick = restaurants[Math.floor(Math.random() * restaurants.length)];
    rollerName.textContent = randomPick.name;
    rollerSub.textContent = `${randomPick.category} | ${randomPick.signature}`;
    diceGraphic.style.transform = `rotate(${counter * 50}deg) scale(1.15)`;

    if (counter >= totalRounds) {
      clearInterval(interval);
      finalizePick();
    }
  }, intervalTime);
}

function finalizePick() {
  // 최종 결과 선택
  const finalPick = restaurants[Math.floor(Math.random() * restaurants.length)];
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

  // 캠퍼스 중심 리셋
  resetMapBtn.addEventListener('click', () => {
    map.flyTo(CAMPUS_COORDS, 14, { animate: true });
  });

  // 룰렛 모달 트리거
  rouletteBtn.addEventListener('click', openRoulette);
  closeModalBtn.addEventListener('click', closeRoulette);
  startRouletteBtn.addEventListener('click', runDiceRoulette);

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
