import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

type AreaChartPoint = {
    date: string;
    value: number;
};

type AreaChartOptions = {
    title: string;
    dataSheetName: string;
    firstDataRow: number;
    categoryColumn: string;
    valueColumn: string;
    points: AreaChartPoint[];
};

type GaugeChartOptions = {
    title: string;
    worksheetIndex: number;
    accuracy: number | null;
    assessmentCount: number;
    periodLabel: string;
};

const relationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function xml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function excelDateSerial(value: string): number {
    const [year, month, day] = value.split('-').map(Number);

    return Date.UTC(year, month - 1, day) / 86_400_000 + 25_569;
}

function addContentType(contentTypes: string, partName: string, contentType: string): string {
    if (contentTypes.includes(`PartName="${partName}"`)) return contentTypes;

    return contentTypes.replace('</Types>', `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`);
}

function addWorksheetRelationship(files: Record<string, Uint8Array>, worksheetIndex: number, drawingIndex: number): string {
    const path = `xl/worksheets/_rels/sheet${worksheetIndex}.xml.rels`;
    const existing = files[path] ? strFromU8(files[path]) : null;
    const relationship = `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/>`;

    if (!existing) {
        files[path] = strToU8(
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationship}</Relationships>`,
        );

        return 'rId1';
    }

    const relationshipIds = Array.from(existing.matchAll(/Id="rId(\d+)"/g), (match) => Number(match[1]));
    const id = `rId${Math.max(0, ...relationshipIds) + 1}`;
    files[path] = strToU8(
        existing.replace(
            '</Relationships>',
            `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/></Relationships>`,
        ),
    );

    return id;
}

export function addNativeAreaChart(workbookBytes: Uint8Array, options: AreaChartOptions): Uint8Array {
    const files = unzipSync(workbookBytes);
    const worksheetPath = 'xl/worksheets/sheet1.xml';
    const contentTypesPath = '[Content_Types].xml';
    const worksheetRelationshipId = addWorksheetRelationship(files, 1, 1);
    const lastDataRow = options.firstDataRow + options.points.length - 1;
    const sheetReference = `'${options.dataSheetName.replaceAll("'", "''")}'`;
    const categoryFormula = `${sheetReference}!$${options.categoryColumn}$${options.firstDataRow}:$${options.categoryColumn}$${lastDataRow}`;
    const valueFormula = `${sheetReference}!$${options.valueColumn}$${options.firstDataRow}:$${options.valueColumn}$${lastDataRow}`;
    const categoryCache = options.points.map((point, index) => `<c:pt idx="${index}"><c:v>${excelDateSerial(point.date)}</c:v></c:pt>`).join('');
    const valueCache = options.points.map((point, index) => `<c:pt idx="${index}"><c:v>${point.value}</c:v></c:pt>`).join('');

    let worksheet = strFromU8(files[worksheetPath]);
    if (!worksheet.includes('xmlns:r=')) {
        worksheet = worksheet.replace('<worksheet ', `<worksheet xmlns:r="${relationshipNamespace}" `);
    }
    worksheet = worksheet.replace('</worksheet>', `<drawing r:id="${worksheetRelationshipId}"/></worksheet>`);
    files[worksheetPath] = strToU8(worksheet);

    let contentTypes = strFromU8(files[contentTypesPath]);
    contentTypes = addContentType(contentTypes, '/xl/drawings/drawing1.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml');
    contentTypes = addContentType(contentTypes, '/xl/charts/chart1.xml', 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
    files[contentTypesPath] = strToU8(contentTypes);

    files['xl/drawings/drawing1.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>8</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>25</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${xml(options.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="${relationshipNamespace}" r:id="rId1"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);
    files['xl/drawings/_rels/drawing1.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`);
    files['xl/charts/chart1.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${relationshipNamespace}">
  <c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1200" b="1"/><a:t>${xml(options.title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:areaChart>
        <c:grouping val="standard"/><c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/><c:tx><c:v>Reports polished</c:v></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="F6CF71"><a:alpha val="45000"/></a:srgbClr></a:solidFill><a:ln w="28575"><a:solidFill><a:srgbClr val="C87C00"/></a:solidFill></a:ln></c:spPr>
          <c:cat><c:numRef><c:f>${xml(categoryFormula)}</c:f><c:numCache><c:formatCode>mmm d</c:formatCode><c:ptCount val="${options.points.length}"/>${categoryCache}</c:numCache></c:numRef></c:cat>
          <c:val><c:numRef><c:f>${xml(valueFormula)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${options.points.length}"/>${valueCache}</c:numCache></c:numRef></c:val>
        </c:ser>
        <c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
        <c:axId val="154927104"/><c:axId val="154928640"/>
      </c:areaChart>
      <c:catAx>
        <c:axId val="154927104"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>
        <c:numFmt formatCode="mmm d" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:solidFill><a:srgbClr val="D9CCB7"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="154928640"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="154928640"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>
        <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="EFE3CF"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr></c:majorGridlines>
        <c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:noFill/></a:ln></c:spPr><c:crossAx val="154927104"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/>
      </c:valAx>
    </c:plotArea>
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`);

    return zipSync(files, { level: 6 });
}

export function addNativeGaugeChart(workbookBytes: Uint8Array, options: GaugeChartOptions): Uint8Array {
    const files = unzipSync(workbookBytes);
    const drawingIndex = 2;
    const chartIndex = 2;
    const worksheetPath = `xl/worksheets/sheet${options.worksheetIndex}.xml`;
    const contentTypesPath = '[Content_Types].xml';
    const worksheetRelationshipId = addWorksheetRelationship(files, options.worksheetIndex, drawingIndex);
    const accuracy = Math.max(0, Math.min(1, (options.accuracy ?? 0) / 100));
    const remaining = 1 - accuracy;
    const accuracyLabel = options.accuracy === null ? '—' : `${options.accuracy.toFixed(2)}%`;
    const assessmentSummary =
        options.assessmentCount === 0
            ? 'No QA assessments in this range'
            : `Average from ${options.assessmentCount} QA assessment${options.assessmentCount === 1 ? '' : 's'}`;

    let worksheet = strFromU8(files[worksheetPath]);
    if (!worksheet.includes('xmlns:r=')) {
        worksheet = worksheet.replace('<worksheet ', `<worksheet xmlns:r="${relationshipNamespace}" `);
    }
    worksheet = worksheet.replace('</worksheet>', `<drawing r:id="${worksheetRelationshipId}"/></worksheet>`);
    files[worksheetPath] = strToU8(worksheet);

    let contentTypes = strFromU8(files[contentTypesPath]);
    contentTypes = addContentType(
        contentTypes,
        `/xl/drawings/drawing${drawingIndex}.xml`,
        'application/vnd.openxmlformats-officedocument.drawing+xml',
    );
    contentTypes = addContentType(
        contentTypes,
        `/xl/charts/chart${chartIndex}.xml`,
        'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
    );
    files[contentTypesPath] = strToU8(contentTypes);

    files[`xl/drawings/drawing${drawingIndex}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>10</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>17</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${xml(options.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="${relationshipNamespace}" r:id="rId1"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from><xdr:col>6</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>7</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>11</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:sp>
      <xdr:nvSpPr><xdr:cNvPr id="3" name="Accuracy value"/><xdr:cNvSpPr txBox="1"/><xdr:nvPr/></xdr:nvSpPr>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr>
      <xdr:txBody>
        <a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/>
        <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="2200" b="1"><a:solidFill><a:srgbClr val="342615"/></a:solidFill></a:rPr><a:t>${xml(accuracyLabel)}</a:t></a:r></a:p>
        <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="850" b="1" cap="all"><a:solidFill><a:srgbClr val="12815B"/></a:solidFill></a:rPr><a:t>TOTAL ACCURACY</a:t></a:r></a:p>
      </xdr:txBody>
    </xdr:sp>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>12</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>10</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>16</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:sp>
      <xdr:nvSpPr><xdr:cNvPr id="4" name="Accuracy details"/><xdr:cNvSpPr txBox="1"/><xdr:nvPr/></xdr:nvSpPr>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr>
      <xdr:txBody>
        <a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/>
        <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="900"><a:solidFill><a:srgbClr val="806F59"/></a:solidFill></a:rPr><a:t>${xml(assessmentSummary)}</a:t></a:r></a:p>
        <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="800"><a:solidFill><a:srgbClr val="9B8A73"/></a:solidFill></a:rPr><a:t>${xml(options.periodLabel)}</a:t></a:r></a:p>
      </xdr:txBody>
    </xdr:sp>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);
    files[`xl/drawings/_rels/drawing${drawingIndex}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartIndex}.xml"/>
</Relationships>`);
    files[`xl/charts/chart${chartIndex}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="1"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1400" b="1"><a:solidFill><a:srgbClr val="342615"/></a:solidFill></a:rPr><a:t>${xml(options.title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:doughnutChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/><c:tx><c:v>Total Accuracy</c:v></c:tx>
          <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="12815B"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>
          <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="DCE6E1"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>
          <c:dPt><c:idx val="2"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>
          <c:val><c:numLit><c:formatCode>0.00%</c:formatCode><c:ptCount val="3"/><c:pt idx="0"><c:v>${accuracy}</c:v></c:pt><c:pt idx="1"><c:v>${remaining}</c:v></c:pt><c:pt idx="2"><c:v>1</c:v></c:pt></c:numLit></c:val>
        </c:ser>
        <c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
        <c:firstSliceAng val="270"/><c:holeSize val="68"/>
      </c:doughnutChart>
    </c:plotArea>
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="zero"/><c:showDLblsOverMax val="0"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`);

    return zipSync(files, { level: 6 });
}
