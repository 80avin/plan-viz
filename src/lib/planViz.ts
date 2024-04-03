import { EventEmitter } from "events";

export const planRaw1 = ` Limit  (cost=1964755.66..1964961.44 rows=1 width=27) (actual time=7579.592..7922.997 rows=1 loops=1)
   ->  Finalize GroupAggregate  (cost=1964755.66..1966196.11 rows=7 width=27) (actual time=7579.590..7579.591 rows=1 loops=1)
         Group Key: lineitem.l_shipmode
         ->  Gather Merge  (cost=1964755.66..1966195.83 rows=28 width=27) (actual time=7559.593..7922.319 rows=6 loops=1)
               Workers Planned: 4
               Workers Launched: 4
               ->  Partial GroupAggregate  (cost=1963755.61..1965192.44 rows=7 width=27) (actual time=7548.103..7564.592 rows=2 loops=5)
                     Group Key: lineitem.l_shipmode
                     ->  Sort  (cost=1963755.61..1963935.20 rows=71838 width=27) (actual time=7530.280..7539.688 rows=62519 loops=5)
                           Sort Key: lineitem.l_shipmode
                           Sort Method: external merge  Disk: 2304kB
                           Worker 0:  Sort Method: external merge  Disk: 2064kB
                           Worker 1:  Sort Method: external merge  Disk: 2384kB
                           Worker 2:  Sort Method: external merge  Disk: 2264kB
                           Worker 3:  Sort Method: external merge  Disk: 2336kB
                           ->  Parallel Hash Join  (cost=382571.01..1957960.99 rows=71838 width=27) (actual time=7036.917..7499.692 rows=62519 loops=5)
                                 Hash Cond: (lineitem.l_orderkey = orders.o_orderkey)
                                 ->  Parallel Seq Scan on lineitem  (cost=0.00..1552386.40 rows=71838 width=19) (actual time=0.583..4901.063 rows=62519 loops=5)
                                       Filter: ((l_shipmode = ANY ('{MAIL,AIR}'::bpchar[])) AND (l_commitdate < l_receiptdate) AND (l_shipdate < l_commitdate) AND (l_receiptdate >= '1996-01-01'::date) AND (l_receiptdate < '1997-01-01 00:00:00'::timestamp without time zone))
                                       Rows Removed by Filter: 11934691
                                 ->  Parallel Hash  (cost=313722.45..313722.45 rows=3750045 width=20) (actual time=2011.518..2011.518 rows=3000000 loops=5)
                                       Buckets: 65536  Batches: 256  Memory Usage: 3840kB
                                       ->  Parallel Seq Scan on orders  (cost=0.00..313722.45 rows=3750045 width=20) (actual time=0.029..995.948 rows=3000000 loops=5)
 Planning Time: 0.977 ms
 Execution Time: 7923.770 ms`;

const queryRaw1 = `select
        l_shipmode,
        sum(case
                when o_orderpriority = '1-URGENT'
                        or o_orderpriority = '2-HIGH'
                        then 1
                else 0
        end) as high_line_count,
        sum(case
                when o_orderpriority <> '1-URGENT'
                        and o_orderpriority <> '2-HIGH'
                        then 1
                else 0
        end) as low_line_count
  from
        orders,
        lineitem
  where
        o_orderkey = l_orderkey
        and l_shipmode in ('MAIL', 'AIR')
        and l_commitdate < l_receiptdate
        and l_shipdate < l_commitdate
        and l_receiptdate >= date '1996-01-01'
        and l_receiptdate < date '1996-01-01' + interval '1' year
  group by
        l_shipmode
  order by
        l_shipmode
  LIMIT 1;
`;

const files = [
  {
    name: "Sample Plan",
    planRaw: planRaw1,
    planParsed: {},
    queryRaw: queryRaw1,
    config: {},
  },
];

const defaultConfig = {
  parsers: [],
};

interface Pos {
  line: number;
  col: number;
}
interface Metrics {
  type: string;
  name: string;
}
interface Node {
  children: Node[];

  pos: Pos;
  source: {
    heading: string;
  };
}
interface Options {
  nodeNameIncludesTableName: boolean;
}
interface Plan {
  tree: Node[];
  descriptions: string[];
}

export class PlanParser {
  pos: Pos;
  tree: Node[];
  _plan: Plan;
  curNode: null | Node;
  nodeCount: number;
  options: Options;
  lines: string[];
  line: null | string;
  text?: string;

  constructor(options: Partial<Options> = {}) {
    this.options = { nodeNameIncludesTableName: false, ...options };

    this.pos = { line: -1, col: 0 };
    this.tree = [];
    this._plan = {
      tree: this.tree,
      descriptions: [],
    };
    this.curNode = null;
    this.nodeCount = 0;
    this.lines = [];
    this.line = null;
  }
  static *traversePlan(plan: Plan) {
    const stack = [...plan.tree];
    while (stack.length) {
      const node = stack.pop();
      yield node;
      stack.push(...node!.children);
    }
  }
  nextLine() {
    do {
      this.pos.line++;
      this.pos.col = 0;
      if (this.pos.line >= this.lines.length) {
        this.line = null;
        return null;
      }
      const rawLine = this.lines[this.pos.line];
      const isQuoted =
        rawLine.length >= 2 &&
        rawLine[0] === '"' &&
        rawLine[rawLine.length - 1] === '"';
      this.line = isQuoted ? rawLine.substr(1, rawLine.length - 2) : rawLine;
      this.pos.col = isQuoted ? 1 : 0;
    } while (typeof this.line === "string" && /^\s*$/.test(this.line));
    return this.line;
  }
  _parseFromText(text: string) {
    this.text = text;
    this.lines = PlanParser.lines(text);
    this.nextLine();
    let iterCount = 0;
    while (this.line && iterCount < 1e6) {
      this.parseNode();
      iterCount++;
    }
    if (iterCount >= 1e6) {
      throw new Error(`Source code too long: ${this.lines.length} lines`);
    }
    this.calculateNodes();
    return this._plan;
  }
  calculateNodes() {
    const { nodeNameIncludesTableName } = this.options;
    for (const node of PlanParser.traversePlan(this._plan)) {
      const heading = node.source.heading;
      node.name = /^\s*(?:->)?([^\(]+)/.exec(heading)?.[1].trim();
      if (
        !(
          nodeNameIncludesTableName === true ||
          (nodeNameIncludesTableName instanceof RegExp &&
            nodeNameIncludesTableName.exec(node.name))
        )
      ) {
        [node.name, node.table] = node.name.split(" on ").map((s) => s.trim());
      }
      node.statsGroups = [];
      for (const statsGroupRaw of heading.matchAll(/\(([^\)]+)\)/g)) {
        const stats = Object.fromEntries(
          statsGroupRaw[1]
            .matchAll(/(?:^|\s)[^=]+=[^\s]+/g)
            .map((v) => v[0])
            .map(PlanParser.parseNodeProperty),
        );
        node.statsGroups.push(stats);
      }
    }
  }
  static parseNodeProperty(propertyRaw) {
    const [key, value = true] = propertyRaw.split("=");
    return [key.trim(), PlanParser.castValue(value)];
  }
  static castValue(str: any) {
    if (typeof str !== "string") return str;
    if (str.includes("..")) {
      return str.split("..").map(PlanParser.castValue);
    }
    const cleanStr = str.trim();
    return Number.isNaN(+cleanStr) ? cleanStr : +cleanStr;
  }

  parseNode() {
    const { pos, line } = this;
    if (!line) return;
    const indent = /^\s*/.exec(line)[0];
    if (indent.length === line.length) {
      throw new Error("Fatal: no empty line expected here");
    }
    if (this.curNode === null && !line.includes("(")) {
      this._plan.descriptions.push(line);
      this.nextLine();
      return;
    }

    const curNode = {
      parent: this.curNode,
      parentId: this.curNode?.id,
      source: {
        heading: line,
        pos: {
          ...pos,
        },
        descriptions: [],
        indent,
      },
      id: this.nodeCount++,
      descriptions: [],
      children: [],
    };
    if (this.curNode) {
      this.curNode.children.push(curNode);
    } else {
      this.tree.push(curNode);
    }
    this.curNode = curNode;
    this.nextLine();
    this.parseNodeContent();
    this.setParentNode();
  }
  parseNodeContent() {
    const { pos, lines } = this;
    if (!this.line) return;
    const nodeIndentSize = this.curNode.source.indent.length;
    let curIndent = /^\s*/.exec(this.line)[0];
    while (curIndent.length > nodeIndentSize) {
      if (curIndent.length < this.line.length) {
        if (this.line.startsWith("->", curIndent.length)) {
          this.parseNode();
        } else {
          this.curNode.source.descriptions.push(this.line);
          this.nextLine();
        }
      }
      curIndent = /^\s*/.exec(this.line)[0];
    }
  }
  setParentNode() {
    let nextNode = this.curNode;
    const indent = /^\s*/.exec(this.line)[0];
    while (nextNode) {
      if (nextNode.source.indent.length === indent.length) {
        this.curNode = nextNode.parent;
        return;
      }
      nextNode = nextNode.parent;
    }
  }
  static parseFromText(text: string, options) {
    const planParser = new PlanParser(options);
    return planParser._parseFromText(text);
  }
  static lines(text: string) {
    return text.split(/\r?\n/);
  }
}

export class PlanViz {
  constructor(planRaw: string, config) {
    this.data = {
      planRaw,
      config: {
        ...defaultConfig,
        ...config,
      },
      parsed: {},
    };
    this.initDefaultHandlers();
  }
  initDefaultHandlers() {
    // this.on("query-plan", (...args) => {
    //   console.log("query-plan", args);
    // });
    // this.on("node", (...args) => {
    //   console.log("node", args);
    // });
  }

  static fromText(text: string, options?) {
    return PlanParser.parseFromText(text, options);
  }

  _node(index = 0, indent = 0) {}
  parse(range = [0, -1]) {}
}

export function sample1(code) {
  try {
    console.log("-----");
    console.log(code);
    const out = PlanViz.fromText(code);
    console.log("-----");
    console.log(out);
    return [code, out];
  } catch (e) {
    console.error(e);
    return [code, e];
  }
}
