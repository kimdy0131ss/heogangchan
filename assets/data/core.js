window.HU = function (id) {
  var us = window.HDATA.units;
  for (var i = 0; i < us.length; i++) {
    if (us[i].id === id) return us[i];
  }
  return null;
};

window.HDATA = {
  meta: {
    title: '역사 기말고사 학습 사이트',
    subtitle: '교과서 요약을 이해하기 쉽게 정리한 학습 도구',
    version: '1.0.0'
  },
  themes: {
    t1: { name: '제국주의와 침략' },
    t2: { name: '식민 통치 체제' },
    t3: { name: '경제 수탈' },
    t4: { name: '민족 말살과 동원' },
    t5: { name: '민족 운동' }
  },
  units: []
};
