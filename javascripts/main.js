// 点击切换页面
document.querySelectorAll('#navbarNav > ul > li > span').forEach(linkItem => {
    linkItem.addEventListener('click', _ => {
        document.querySelectorAll('#navbarNav > ul > li > span').forEach(item => {
            item.classList.remove('active');
            document.getElementById(item.ariaLabel).style.display = 'none';
        });
        linkItem.classList.add('active');
        document.getElementById(linkItem.ariaLabel).style.display = 'flex';
        document.querySelector('#navTitle').innerHTML = linkItem.textContent.trim();
        document.querySelector('.collapse').classList.remove('show')
    })
})

//点击切换主题
document.querySelector('.switchbtn').addEventListener('click', _ => {
    const html = document.documentElement;
    const current_theme = html.getAttribute('data-bs-theme');
    html.setAttribute('data-bs-theme', current_theme === 'light' ? 'dark' : 'light');
});

//点击查询笔顺
document.querySelector('#searchBtn').addEventListener('click', _ => {
    //清空分步笔顺图解、笔顺动画演示、笔顺描写练习内容
    ['stroke', 'animation', 'quiz'].forEach(demoType => {
        document.getElementById(`${demoType}-target`).innerHTML = "";
    });
    let character = document.getElementById('hanziSearch').value;
    HanziWriter.loadCharacterData(character).then(charData => {
        let strokeTarget = document.getElementById('stroke-target');
        for (let i = 0; i < charData.strokes.length; i++) {
            let strokesPortion = charData.strokes.slice(0, i + 1);
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            strokeTarget.appendChild(svg);
            let group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            // set the transform property on the g element so the character renders at 75x75
            let transformData = HanziWriter.getScalingTransform(75, 75);
            group.setAttributeNS(null, 'transform', transformData.transform);
            svg.appendChild(group);

            strokesPortion.forEach(strokePath => {
                let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttributeNS(null, 'd', strokePath);
                // style the character paths
                path.style.fill = '#555';
                group.appendChild(path);
            });
        }
    });
    animationWriter = HanziWriter.create('animation-target', character, {
        width: 300,
        height: 300,
        showOutline: document.getElementById('animation-show-outline').checked,
        showCharacter: false
    });
    quizWriter = HanziWriter.create('quiz-target', character, {
        width: 300,
        height: 300,
        showOutline: document.getElementById('quiz-show-outline').checked,
        showCharacter: false,
        showHintAfterMisses: 1
    });
    quizWriter.quiz();

    // for easier debugging
    window.animationWriter = animationWriter;
    window.quizWriter = quizWriter;
})

//渲染边框
let preview_frame = document.querySelector('#previewFrame').contentWindow;
let preview_line_number = document.querySelector('#line-number');
let preview_strokes_number = document.querySelector('#strokes-number');
let preview_copy_content = document.querySelector('#copy-content');
let copy_print_btn = document.querySelector('#copyPrintBtn');
let preview_setting_box = document.querySelector('#previewBox');
let preview_setting_confirm_btn = document.querySelector('#confirmBtn');
let preview_zoomin_btn = document.querySelector('#previewZoomIn');
let preview_zoomout_btn = document.querySelector('#previewZoomOut');
let preview_zoomselect_btn = document.querySelector('#previewZoomSelect');
function genBorder(strokeArry = []) {
    preview_frame.document.querySelectorAll('section').forEach(el => el.remove())
    const lettersSet = + preview_line_number.value;
    const strokeSet = + preview_strokes_number.value;
    const content = strokeArry.length == 0 ? [''] : strokeArry.map(item => item.letter);
    const strokeObj = strokeArry.reduce((obj, item) => {
        obj[item.letter] = item.storks;
        return obj;
    }, { '': [] })
    /*
    每个格子分为两部分：边框+文字；
    每个文字有四种状态：
      状 态 | 代码
     无文字 |  0
      笔 画 | 1-64
      全 描 | 100
      描 字 | 200
    1. 单字|0
    先是笔顺；
    最后6行是无文字；
    中间是描字

    2. 单行|1
    第一个格子是全描字；
    如果是全描，接下来是描字；
    如果是不描，接下来是无文字；

    3. 两行|2
    第一个格子是全描字；
    如果是全描，剩余全部是描字；
    如果是不描，剩余全部是无文字；
    如果是半描，第一行是描字，第二行是空白

    4. 未选择|NAN
    全部格子是无文字。
    */
    let letterArrays = [Array(96).fill(['', 0])];
    switch (lettersSet) {
        case 0:
            letterArrays = content.map(letterItem => {
                let letterArray = [];
                let letter_strokes = strokeObj[letterItem];
                let strokeOrder = 1;
                //先是笔顺
                while (strokeOrder <= letter_strokes.length) {
                    letterArray.push([letterItem, strokeOrder])
                    strokeOrder++;
                };
                //笔顺最后一行用空文字填满
                letterArray.push(...Array(Math.ceil(letterArray.length / 8) * 8 - letterArray.length)
                    .fill(['', 0])
                );
                //笔顺后接描字
                letterArray.push(...Array(48 - letterArray.length).fill([letterItem, 200]));
                //最后6行用空文字填满
                letterArray.push(...Array(48).fill(['', 0]));
                return letterArray
            })
            break
        case 1:
            letterArrays = content.map(letterItem => {
                //第一个格子是全描字
                let letterArray = [[letterItem, 100]];
                //全描是200，不描是0
                letterArray.push(...Array(7).fill([letterItem, strokeSet * 25]));
                return letterArray
            });
            break
        case 2:
            letterArrays = content.map(letterItem => {
                //第一个格子是全描字
                let letterArray = [[letterItem, 100]];
                //第一行
                letterArray.push(...Array(7).fill([letterItem, strokeSet === 0 ? 0 : 200]));
                //第二行
                letterArray.push(...Array(8).fill([letterItem, strokeSet === 8 ? 200 : 0]));
                return letterArray
            });
            break
    }
    const allLetterArray = letterArrays.flat();
    const sheetNumber = Math.ceil(allLetterArray.length / 96);
    //剩余位置用空字符填充
    allLetterArray.push(...Array(96 * sheetNumber - allLetterArray.length).fill(['', 0]))
    let strokeTransform = HanziWriter.getScalingTransform(80, 80).transform;
    new Array(sheetNumber).keys().forEach(sheetNumb => {
        let borderSection = preview_frame.document.createElement('section');
        borderSection.className = 'sheet';
        preview_frame.document.body.appendChild(borderSection);

        new Array(96).keys().forEach(numb => {
            let svg = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            let useTag = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'use');
            useTag.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#strokeBorder');
            [letterItem, letterSet] = allLetterArray[96 * sheetNumb + numb];
            // console.log(letterItem, letterSet)
            let letter_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            let letter_color = letterSet === 200 ? '#ddd' : '#555';
            let letter_strokes = strokeObj[letterItem];
            if (letter_strokes.length === 0) {
                let letter_text = preview_frame.document.createElement('text');
                letter_text.style.color = letter_color;
                letter_text.innerHTML = letterItem;
                letter_group.appendChild(letter_text);
            } else {
                letter_group.setAttributeNS(null, 'transform', strokeTransform);
                let strokeOrder = letterSet === 100 ? letter_strokes.length : letterSet;
                letter_strokes.slice(0, strokeOrder).forEach(strokePath => {
                    let path = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttributeNS(null, 'd', strokePath);
                    path.style.fill = letter_color;
                    letter_group.appendChild(path);
                });
            }

            // 上面线条
            let topLine = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'line');
            [['x1', '0'], ['y1', '0'], ['x2', '80'], ['y2', '0']].forEach(attributes => {
                topLine.setAttributeNS(null, ...attributes);
                topLine.setAttributeNS(null, 'stroke-width', numb < 8 ? 5 : 3);
            });
            svg.appendChild(topLine);

            // 左面线条            
            let leftLine = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'line');
            [['x1', '0'], ['y1', '0'], ['x2', '0'], ['y2', '80']].forEach(attributes => {
                leftLine.setAttributeNS(null, ...attributes);
                leftLine.setAttributeNS(null, 'stroke-width', numb % 8 === 0 ? 5 : 3);
            });
            svg.appendChild(leftLine);

            // 右面线条
            if (numb % 8 === 7) {
                let rightLine = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'line');
                [['x1', '80'], ['y1', '0'], ['x2', '80'], ['y2', '80']].forEach(attributes => {
                    rightLine.setAttributeNS(null, ...attributes);
                    rightLine.setAttributeNS(null, 'stroke-width', 5);
                });
                svg.appendChild(rightLine);
            }

            // 下面线条
            if (numb > 87) {
                let bottomLine = preview_frame.document.createElementNS('http://www.w3.org/2000/svg', 'line');
                [['x1', '0'], ['y1', '80'], ['x2', '80'], ['y2', '80']].forEach(attributes => {
                    bottomLine.setAttributeNS(null, ...attributes);
                    bottomLine.setAttributeNS(null, 'stroke-width', 5);
                });
                svg.appendChild(bottomLine);
            }
            svg.appendChild(useTag);
            svg.appendChild(letter_group);
            borderSection.appendChild(svg);
        });
    });
};
//生成字帖
copy_print_btn.addEventListener('click', event => {
    preview_frame.print()
})

//点击缩小
preview_zoomin_btn.addEventListener('click', event => {
    scaleValue -= 0.2;
    scaleValue = scaleValue < 0.1 ? 0.1 : scaleValue;
    preview_frame.document.querySelector('body').style.transform = `scale(${scaleValue})`
})

//点击放大
preview_zoomout_btn.addEventListener('click', event => {
    scaleValue += 0.2;
    preview_frame.document.querySelector('body').style.transform = `scale(${scaleValue})`
})

//点击缩放选项
preview_zoomselect_btn.addEventListener('change', event => {
    let frameWidth = preview_frame.innerWidth;
    let frameHeight = preview_frame.innerHeight;
    let sheetWidth = preview_frame.document.querySelector('.sheet').offsetWidth;
    let sheetHeight = preview_frame.document.querySelector('.sheet').offsetHeight;
    switch (event.target.value) {
        case 'width':
            scaleValue = (frameWidth / sheetWidth).toFixed(1);
            break
        case 'height':
            scaleValue = (frameHeight / sheetHeight).toFixed(1);
            break
        default:
            scaleValue = parseFloat(event.target.value);
    }
    preview_frame.document.querySelector('body').style.transform = `scale(${scaleValue})`
})

//切换字帖选项
preview_line_number.addEventListener('change', event => {
    preview_strokes_number.options.length = 0;
    let lettersSet = + preview_line_number.value;
    let optionsetArray = [];
    switch (lettersSet) {
        case 0:
            optionsetArray.push(['笔顺&半描字', '']);
            break
        case 2:
            optionsetArray.push(['选择描字设置', ''], ['不描字', 0], ['全描字', 8], ['半描字', 4]);
            break
        case 1:
            optionsetArray.push(['选择描字设置', ''], ['不描字', 0], ['全描字', 8]);
            break
        default:
            optionsetArray.push(['请先选择练习字数', '']);
    }
    optionsetArray.forEach(optionset => preview_strokes_number.options.add(new Option(...optionset)));
});

//点击确认按钮
preview_setting_confirm_btn.addEventListener('click', async event => {
    const currentStokeArray = await Promise.all([...preview_copy_content.value].map(letterItem => {
        return HanziWriter.loadCharacterData(letterItem)
            .then(charData => {
                return { 'letter': letterItem, 'storks': charData.strokes }
            })
            .catch(_ => {
                console.log(`【${letterItem}】不存在`)
            })
    }));
    genBorder(currentStokeArray);
    document.querySelector('#previewBox').style.display = 'none'
})
