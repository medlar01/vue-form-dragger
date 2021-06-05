namespace Tbu {
  export function template() {
    return [
      { type: 0, del: false, text: "", style: {} },
      { type: 0, del: false, text: "", style: {} },
      { type: 0, del: false, text: "", style: {} },
      { type: 0, del: false, text: "", style: {} }
    ]
  }

  export function menuHandler(evt: any, self: any) {
    const { config, modelValue: model } = self
    const { offsetLeft, offsetTop } = config.el
    const { pageX, pageY } = evt
    const { meta } = model
    const serial: string = getTd(evt.path).getAttribute("serial")
    const menuList = {
      width: "80px",
      list: [
        {
          text: "表格",
          icon: "fa fa-chevron-right",
          list: []
        }
      ]
    }
    const { list }: any = menuList.list[0]
    headMenu(meta, list)
    rowMenu(meta, list, serial)
    colMenu(meta, list, serial)
    mergeMenu(evt, meta, list, self)
    config.showmenu(pageX - offsetLeft - 260 + "px", pageY - offsetTop + "px", model, menuList)
  }

  export function editAddListener(self: any) {
    const table = self.$el.querySelector("table")
    const hasEvt = ((window as any).__Has_Table_Evt_ = (window as any).__Has_Table_Evt_ || false)
    if (!hasEvt) {
      self.config.el.addEventListener("click", (e: any) => {
        table.onclick = undefined
        table.onmousedown = undefined
        table.onmousemove = undefined
        table.onmouseup = undefined
        if (self.cacheEdit) self.cacheEdit.edit = false
      })
      ;(window as any).__Has_Table_Evt_ = !hasEvt
    }
  }
}
export default Tbu

/**
 * 表头菜单
 * @param meta 单元数据
 * @param menuList 菜单集合
 */
function headMenu(meta: any, menuList: any[]) {
  if (Object.keys(meta.head).length === 0) {
    menuList.push({
      text: "添加头",
      icon: "fa fa-question-circle",
      handler(evt: any) {
        const size = Object.keys(meta.body[0]).length
        for (let index = 0; index < size; index++) {
          meta.head.push({ type: 0, del: false, text: "", style: {} })
        }
      }
    })
  } else {
    menuList.push({
      text: "删除头",
      icon: "fa fa-question-circle",
      handler(evt: any) {
        meta.head = []
      }
    })
  }
}

/**
 * 表行菜单
 * @param meta 单元数据
 * @param menuList 菜单集合
 * @param serial 单元格序列
 */
function rowMenu(meta: any, menuList: any[], serial: string) {
  menuList.push({
    text: "添加行",
    icon: "fa fa-question-circle",
    handler(evt: any) {
      const li = []
      const size = Object.keys(meta.body[0]).length
      const idx: number = serial.indexOf("-") > 0 ? parseInt(serial.split("-")[0]) : 0
      for (let index = 0; index < size; index++) {
        li.push({ type: 0, del: false, text: "", style: {} })
      }
      meta.body.splice(idx + 1, 0, li)
    }
  })
  if (meta.body.length > 1) {
    menuList.push({
      text: "删除行",
      icon: "fa fa-question-circle",
      handler(evt: any) {
        const idx: number = serial.indexOf("-") > 0 ? parseInt(serial.split("-")[0]) : NaN
        if (idx !== NaN) {
          // 即将被删除的行,遍历将上面行的rowspan扣除
          const row = meta.body[idx]
          for (const index in row) {
            const cell = row[index]
            if (!cell.del) continue
            for (const key in meta.body) {
              const r = meta.body[key]
              const c = r[index]
              if (c.rowspan > 0) {
                c.rowspan = c.rowspan - 1
                if (c.rowspan === 1) delete c.rowspan
                break
              }
            }
          }
          meta.body.splice(idx, 1)
        } else {
          meta.head = []
        }
      }
    })
  }
}

/**
 * 表列菜单
 * @param meta 单元数据
 * @param menuList 菜单集合
 * @param serial 单元格序列
 */
function colMenu(meta: any, menuList: any[], serial: string) {
  menuList.push({
    text: "添加列",
    icon: "fa fa-question-circle",
    handler(evt: any) {
      if (Object.keys(meta.head).length !== 0) {
        meta.head.push({ type: 0, text: "", style: {} })
      }
      for (let index = 0; index < meta.body.length; index++) {
        const idx: number = serial.indexOf("-") > 0 ? parseInt(serial.split("-")[1]) : parseInt(serial)
        const li = Object.values(meta.body[index])
        li.splice(idx + 1, 0, { type: 0, del: false, text: "", style: {} })
        meta.body[index] = li
      }
    }
  })
  if (Object.keys(meta.body[0]).length > 1) {
    menuList.push({
      text: "删除列",
      icon: "fa fa-question-circle",
      handler(evt: any) {
        const idx: number = serial.indexOf("-") > 0 ? parseInt(serial.split("-")[1]) : parseInt(serial)
        if (Object.keys(meta.head).length !== 0) {
          meta.head.splice(idx, 1)
        }
        for (let index = 0; index < meta.body.length; index++) {
          const li = Object.values(meta.body[index])
          li.splice(idx, 1)
          meta.body[index] = li
        }
      }
    })
  }
}

const __class_name_ = "cell-selected"
/**
 * 合并单元格菜单
 * @param meta 单元数据
 * @param menuList 菜单集合
 * @param self vue组件实例
 */
function mergeMenu(evt: any, meta: any, menuList: any[], self: any) {
  const table = self.$el.querySelector("table")
  const cacheTableData: any = {
    midRowIndex: 0,
    midColIndex: 0,
    enabled: false,
    type: 1,
    tdList: [] // 外层是行，内层是列
  }
  let cacheTarget: any = null
  menuList.push({
    text: "合并单元格",
    icon: "fa fa-question-circle",
    handler(e: any) {
      table.onclick = (e: any) => {
        e.stopPropagation()
        e.returnValue = false
      }
      // 扫描所有的td
      cacheTableData.tdList = []
      // 鼠标左键按下
      table.onmousedown = function(e: any) {
        if (e.which !== 1) return
        const td = getTd(e.path)
        cacheTableData.enabled = true
        const serial: string = td.getAttribute("serial")
        if (td.nodeName === "TD") {
          const tdList: any[] = table.querySelectorAll("tr td[serial]")
          tdList.forEach((el) => {
            const serial: string = el.getAttribute("serial")
            const sp: any[] = serial.split("-")
            const colList: any[] = (cacheTableData.tdList[sp[0]] = cacheTableData.tdList[sp[0]] || [])
            colList.push({ selected: false, el: el, serial })
          })
          cacheTableData.type = 1
          cacheTableData.midRowIndex = parseInt(serial.split("-")[0])
          cacheTableData.midColIndex = parseInt(serial.split("-")[1])
        } else {
          const tdList: any[] = table.querySelectorAll("tr th[serial]")
          tdList.forEach((el) => {
            const colList: any[] = (cacheTableData.tdList[0] = cacheTableData.tdList[0] || [])
            const serial: string = el.getAttribute("serial")
            colList.push({ selected: false, el: el, serial: `0-${serial}` })
          })
          cacheTableData.type = 0
          cacheTableData.midRowIndex = 0
          cacheTableData.midColIndex = parseInt(serial)
        }
        e.stopPropagation()
        e.returnValue = false
      }
      // 鼠标移动
      table.onmousemove = function(e: any) {
        if (cacheTableData.enabled) {
          const td = getTd(e.path)
          if (cacheTableData.type === 0 && td?.nodeName !== "TH") return
          if (cacheTarget != td) {
            cacheTarget = td
            const serial: string = td.getAttribute("serial")
            const rowIndex = cacheTableData.type === 1 ? parseInt(serial.split("-")[0]) : 0
            const colIndex = parseInt(cacheTableData.type === 1 ? serial.split("-")[1] : serial)
            // 擦除样式
            eraseStyle(cacheTableData.tdList)
            // 选中单元格
            doRowSelect(cacheTableData, rowIndex, colIndex)
            // 渲染
            drawRowSelect(cacheTableData)
          }
        }
      }
      // 鼠标释放
      table.onmouseup = function(e: any) {
        if (cacheTableData.enabled) {
          cacheTableData.enabled = false
          mergeCell(cacheTableData, meta)
          // 擦除样式
          eraseStyle(cacheTableData.tdList)
          table.onclick = undefined
          table.onmousedown = undefined
          table.onmousemove = undefined
          table.onmouseup = undefined
        }
      }
    }
  })
}

/**
 * 擦除样式
 * @param tdList 单元格集合
 */
function eraseStyle(tdList: any[][]) {
  for (const key in tdList) {
    const element = tdList[key]
    for (const k in element) {
      const td = element[k]
      if (td.selected) {
        td.selected = false
        td.el.classList.remove(__class_name_)
      }
    }
  }
}

// 选中行方法
function doRowSelect(cacheTableData: any, rowIndex: number, colIndex: number) {
  // 选中上半边单元格
  if (cacheTableData.midRowIndex > rowIndex) {
    for (let index = rowIndex; index <= cacheTableData.midRowIndex; index++) {
      doColSelect(cacheTableData, index, colIndex)
    }
  }
  // 选中中间的单元格
  else if (cacheTableData.midRowIndex === rowIndex) {
    doColSelect(cacheTableData, rowIndex, colIndex)
  }
  // 选中下半边单元格
  else {
    for (let index = cacheTableData.midRowIndex; index <= rowIndex; index++) {
      doColSelect(cacheTableData, index, colIndex)
    }
  }
}

// 选中列方法
function doColSelect(cacheTableData: any, rowIndex: number, colIndex: number) {
  const colList = cacheTableData.tdList[rowIndex]
  if (!colList) return
  // 选中左边单元格
  if (cacheTableData.midColIndex > colIndex) {
    const rowspan = parseInt(colList[cacheTableData.midColIndex].el.getAttribute("rowspan") || "0")
    for (let idx = colIndex; idx <= cacheTableData.midColIndex; idx++) {
      colList[idx].selected = true
      if (rowspan === 0) continue
      for (let index = 1; index < rowspan; index++) {
        const nextColList = cacheTableData.tdList[index + rowIndex]
        nextColList[idx].selected = true
      }
    }
  }
  // 选中中间的单元格
  else if (cacheTableData.midColIndex === colIndex) {
    colList[colIndex].selected = true
  }
  // 选中右边的单元格
  else {
    const rowspan = parseInt(colList[cacheTableData.midColIndex].el.getAttribute("rowspan") || "0")
    for (let idx = cacheTableData.midColIndex; idx <= colIndex; idx++) {
      colList[idx].selected = true
      if (rowspan === 0) continue
      for (let index = 1; index < rowspan; index++) {
        const nextColList = cacheTableData.tdList[index + rowIndex]
        nextColList[idx].selected = true
      }
    }
  }
}

/**
 * 渲染选中单元格
 * @param cacheTableData 表格缓存数据
 */
function drawRowSelect(cacheTableData: any) {
  // 0-0      0-1[sp 2] 0-2     0-3
  // 1-0      1-1       1-2     1-3
  // 2-0      2-1       2-2     2-3

  let rowMinIndex = 100000
  let rowMaxIndex = 0
  let cellMinIndex = 100000
  let cellMaxIndex = 0

  // 行循环
  for (let index = 0; index < cacheTableData.tdList.length; index++) {
    const rows = cacheTableData.tdList[index]
    // 列循环
    for (let idx = 0; idx < rows.length; idx++) {
      const cell = rows[idx]
      if (!cell || !cell.selected) continue
      const split: string[] = cell.serial.split("-")
      const n1: number = parseInt(split[0])
      const n2: number = parseInt(split[1])
      if (rowMinIndex > n1) rowMinIndex = n1
      if (rowMaxIndex < n1) rowMaxIndex = n1
      if (cellMinIndex > n2) cellMinIndex = n2
      if (cellMaxIndex < n2) cellMaxIndex = n2
      const rowspan = parseInt(cell.el.getAttribute("rowspan") || "1") - 1
      const colspan = parseInt(cell.el.getAttribute("colspan") || "1") - 1
      if (rowspan + index > rowMaxIndex) {
        rowMaxIndex = rowspan + index
      }
      if (colspan + idx > cellMaxIndex) {
        cellMaxIndex = colspan + idx
      }
    }
  }

  for (let index = rowMinIndex; index <= rowMaxIndex; index++) {
    for (let idx = cellMinIndex; idx <= cellMaxIndex; idx++) {
      cacheTableData.tdList[index][idx].selected = true
      cacheTableData.tdList[index][idx].el.classList.add(__class_name_)
    }
  }
}

/**
 * 合并单元格
 * @param cacheTableData 表格缓存数据
 * @param meta 绑定数据
 */
function mergeCell(cacheTableData: any, meta: any) {
  let rowMinIndex = -1
  let rowMaxIndex = -1
  let cellMinIndex = -1
  let cellMaxIndex = -1

  for (let index = 0; index < cacheTableData.tdList.length; index++) {
    const element = cacheTableData.tdList[index]
    for (let idx = 0; idx < element.length; idx++) {
      const el = element[idx]
      if (!el.selected) continue
      rowMaxIndex = index
      cellMaxIndex = idx
      if (rowMinIndex === -1) {
        rowMinIndex = index
        cellMinIndex = idx
      }
    }
  }
  const callback = (list: any[][]) => {
    // 一行
    if (rowMinIndex === rowMaxIndex) {
      if (cellMinIndex === cellMaxIndex) return
      list[rowMinIndex][cellMinIndex].colspan = cellMaxIndex - cellMinIndex + 1
      for (let idx = cellMinIndex + 1; idx <= cellMaxIndex; idx++) {
        list[rowMinIndex][idx].del = true
      }
    }
    // 多行
    else {
      list[rowMinIndex][cellMinIndex].rowspan = rowMaxIndex - rowMinIndex + 1
      list[rowMinIndex][cellMinIndex].colspan = cellMaxIndex - cellMinIndex + 1
      for (let index = rowMinIndex; index <= rowMaxIndex; index++) {
        for (let idx = cellMinIndex; idx <= cellMaxIndex; idx++) {
          if (index === rowMinIndex && idx === cellMinIndex) continue
          list[index][idx].del = true
        }
      }
    }
  }
  if (cacheTableData.type == 1) {
    callback(meta.body)
  } else {
    callback([meta.head])
  }
}

function getTd(path: any) {
  for (const key in path) {
    const element = path[key]
    if (["TH", "TD"].includes(element.nodeName)) {
      return element
    }
  }
  return null
}
