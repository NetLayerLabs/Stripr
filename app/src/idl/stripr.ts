/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/stripr.json`.
 */
export type Stripr = {
  "address": "9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF",
  "metadata": {
    "name": "stripr",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Yield stripping for tokenized stocks on Solana"
  },
  "docs": [
    "Stripr splits a tokenized stock into a Principal Token (PT) and a Yield",
    "Token (YT). Locked YT earns the stock's reinvested dividends (growth in the",
    "mint's scaled UI multiplier) plus any cash dividends the admin distributes."
  ],
  "instructions": [
    {
      "name": "cancelOffer",
      "docs": [
        "Returns an offer's unsold tokens to the maker and closes it."
      ],
      "discriminator": [
        92,
        203,
        223,
        40,
        92,
        89,
        53,
        119
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true,
          "relations": [
            "offer"
          ]
        },
        {
          "name": "market",
          "docs": [
            "Included so cancellations show up in the market's transaction history."
          ],
          "relations": [
            "offer"
          ]
        },
        {
          "name": "offer",
          "writable": true
        },
        {
          "name": "tokenMint",
          "relations": [
            "offer"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  102,
                  101,
                  114,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "makerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimStockYield",
      "docs": [
        "Claims the underlying stock earned from multiplier growth."
      ],
      "discriminator": [
        22,
        109,
        192,
        252,
        177,
        85,
        41,
        11
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "underlyingVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  114,
                  108,
                  121,
                  105,
                  110,
                  103,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userUnderlying",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "underlyingMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimYield",
      "docs": [
        "Claims all cash dividends earned by the caller's locked YT."
      ],
      "discriminator": [
        49,
        74,
        111,
        7,
        186,
        22,
        61,
        165
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "dividendMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "dividendVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  118,
                  105,
                  100,
                  101,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userDividend",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "dividendTokenProgram"
              },
              {
                "kind": "account",
                "path": "dividendMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "dividendTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createOffer",
      "docs": [
        "Lists PT or YT for sale at a fixed price in the market's quote token."
      ],
      "discriminator": [
        237,
        233,
        192,
        168,
        248,
        7,
        249,
        241
      ],
      "accounts": [
        {
          "name": "maker",
          "writable": true,
          "signer": true
        },
        {
          "name": "market"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "offer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  102,
                  101,
                  114,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "makerToken",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program of the PT/YT mints (the underlying stock's program)."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "distributeDividend",
      "docs": [
        "Admin deposits a cash dividend for all locked YT."
      ],
      "discriminator": [
        209,
        66,
        136,
        45,
        233,
        252,
        123,
        134
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "dividendMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "dividendVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  118,
                  105,
                  100,
                  101,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "adminDividend",
          "writable": true
        },
        {
          "name": "dividendTokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fillOffer",
      "docs": [
        "Buys all or part of an offer at the price the taker expects."
      ],
      "discriminator": [
        83,
        15,
        200,
        85,
        160,
        80,
        164,
        61
      ],
      "accounts": [
        {
          "name": "taker",
          "writable": true,
          "signer": true
        },
        {
          "name": "maker",
          "docs": [
            "Receives the payment and, once the offer sells out, its rent."
          ],
          "writable": true,
          "relations": [
            "offer"
          ]
        },
        {
          "name": "market",
          "relations": [
            "offer"
          ]
        },
        {
          "name": "offer",
          "writable": true
        },
        {
          "name": "tokenMint",
          "relations": [
            "offer"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  102,
                  102,
                  101,
                  114,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "offer"
              }
            ]
          }
        },
        {
          "name": "takerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "taker"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "dividendMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "takerQuote",
          "writable": true
        },
        {
          "name": "makerQuote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "maker"
              },
              {
                "kind": "account",
                "path": "dividendTokenProgram"
              },
              {
                "kind": "account",
                "path": "dividendMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "dividendTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "expectedPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMarket",
      "docs": [
        "Creates the market, PT/YT mints and vaults for one underlying stock."
      ],
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "underlyingMint"
        },
        {
          "name": "dividendMint"
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "underlyingMint"
              }
            ]
          }
        },
        {
          "name": "ptMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "ytMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "underlyingVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  114,
                  108,
                  121,
                  105,
                  110,
                  103,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "ytEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  116,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "dividendVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  118,
                  105,
                  100,
                  101,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program of the underlying stock; PT and YT are minted under it too."
          ]
        },
        {
          "name": "dividendTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "lockYt",
      "docs": [
        "Locks YT so it earns stock yield and cash dividends."
      ],
      "discriminator": [
        202,
        10,
        4,
        121,
        221,
        196,
        183,
        67
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  116,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userYt",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeem",
      "docs": [
        "Burns PT + YT (share units) and returns the principal in raw underlying."
      ],
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ptMint",
          "writable": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytMint",
          "writable": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "underlyingVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  114,
                  108,
                  121,
                  105,
                  110,
                  103,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userUnderlying",
          "writable": true
        },
        {
          "name": "userPt",
          "writable": true
        },
        {
          "name": "userYt",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "strip",
      "docs": [
        "Deposits raw underlying and mints PT + YT in share units."
      ],
      "discriminator": [
        246,
        68,
        231,
        141,
        62,
        163,
        189,
        126
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ptMint",
          "writable": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytMint",
          "writable": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "underlyingVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  114,
                  108,
                  121,
                  105,
                  110,
                  103,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userUnderlying",
          "writable": true
        },
        {
          "name": "userPt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "ptMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userYt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "ytMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "syncMultiplier",
      "docs": [
        "Permissionless: applies the stock's latest scaled UI multiplier."
      ],
      "discriminator": [
        73,
        87,
        65,
        155,
        125,
        41,
        159,
        230
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "unlockYt",
      "docs": [
        "Unlocks YT back to the user's wallet."
      ],
      "discriminator": [
        108,
        55,
        45,
        189,
        27,
        133,
        106,
        31
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "underlyingMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytMint",
          "relations": [
            "market"
          ]
        },
        {
          "name": "ytEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  116,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userYt",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "offer",
      "discriminator": [
        215,
        88,
        60,
        71,
        170,
        162,
        73,
        229
      ]
    },
    {
      "name": "yieldPosition",
      "discriminator": [
        77,
        217,
        160,
        86,
        158,
        186,
        248,
        193
      ]
    }
  ],
  "events": [
    {
      "name": "dividendDistributed",
      "discriminator": [
        188,
        247,
        85,
        115,
        23,
        100,
        212,
        49
      ]
    },
    {
      "name": "multiplierSynced",
      "discriminator": [
        33,
        249,
        58,
        249,
        2,
        2,
        49,
        214
      ]
    },
    {
      "name": "offerCancelled",
      "discriminator": [
        45,
        42,
        175,
        214,
        51,
        192,
        154,
        9
      ]
    },
    {
      "name": "offerCreated",
      "discriminator": [
        31,
        236,
        215,
        144,
        75,
        45,
        157,
        87
      ]
    },
    {
      "name": "offerFilled",
      "discriminator": [
        173,
        104,
        95,
        161,
        144,
        206,
        72,
        57
      ]
    },
    {
      "name": "redeemed",
      "discriminator": [
        14,
        29,
        183,
        71,
        31,
        165,
        107,
        38
      ]
    },
    {
      "name": "stockYieldClaimed",
      "discriminator": [
        188,
        105,
        113,
        172,
        65,
        191,
        116,
        250
      ]
    },
    {
      "name": "stripped",
      "discriminator": [
        197,
        93,
        254,
        92,
        123,
        28,
        78,
        192
      ]
    },
    {
      "name": "yieldClaimed",
      "discriminator": [
        177,
        201,
        94,
        68,
        19,
        200,
        227,
        27
      ]
    },
    {
      "name": "ytLocked",
      "discriminator": [
        219,
        188,
        22,
        191,
        91,
        152,
        52,
        27
      ]
    },
    {
      "name": "ytUnlocked",
      "discriminator": [
        55,
        167,
        130,
        219,
        80,
        172,
        66,
        238
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6002,
      "name": "unauthorized",
      "msg": "Only the market admin can do this"
    },
    {
      "code": 6003,
      "name": "noYieldTokensLocked",
      "msg": "No YT is locked in this market, so the dividend has no recipients"
    },
    {
      "code": 6004,
      "name": "dividendTooSmall",
      "msg": "Dividend is too small to register against the locked YT supply"
    },
    {
      "code": 6005,
      "name": "insufficientLockedYt",
      "msg": "Not enough YT locked in this position"
    },
    {
      "code": 6006,
      "name": "nothingToClaim",
      "msg": "No dividends to claim"
    },
    {
      "code": 6007,
      "name": "invalidMultiplier",
      "msg": "The stock's scaled UI multiplier is invalid"
    },
    {
      "code": 6008,
      "name": "invalidOfferToken",
      "msg": "Offers can only sell this market's PT or YT"
    },
    {
      "code": 6009,
      "name": "offerPriceChanged",
      "msg": "The offer's price changed. Review it and try again"
    },
    {
      "code": 6010,
      "name": "insufficientOfferAmount",
      "msg": "Not enough left in this offer"
    }
  ],
  "types": [
    {
      "name": "dividendDistributed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "accDividendPerYt",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "One yield-stripping market per underlying stock mint. The market PDA is the",
        "mint authority for PT/YT and the owner of every vault.",
        "",
        "PT and YT are denominated in share units: raw underlying × the mint's scaled",
        "UI multiplier (1 for mints without one). When the issuer raises the",
        "multiplier to reinvest a dividend, fewer raw tokens back the same principal",
        "and the freed tokens become yield for locked YT."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "underlyingMint",
            "type": "pubkey"
          },
          {
            "name": "dividendMint",
            "type": "pubkey"
          },
          {
            "name": "ptMint",
            "type": "pubkey"
          },
          {
            "name": "ytMint",
            "type": "pubkey"
          },
          {
            "name": "totalStripped",
            "docs": [
              "Outstanding PT (and YT) supply, in share units."
            ],
            "type": "u64"
          },
          {
            "name": "totalYtLocked",
            "docs": [
              "YT locked in the escrow and earning."
            ],
            "type": "u64"
          },
          {
            "name": "accDividendPerYt",
            "docs": [
              "Cumulative cash dividends per locked YT, scaled by `ACC_PRECISION`."
            ],
            "type": "u128"
          },
          {
            "name": "totalDividends",
            "type": "u64"
          },
          {
            "name": "multiplier",
            "docs": [
              "Highest effective scaled UI multiplier applied so far, scaled by `MULTIPLIER_ONE`."
            ],
            "type": "u128"
          },
          {
            "name": "accStockPerYt",
            "docs": [
              "Cumulative raw underlying yield per locked YT, scaled by `ACC_PRECISION`."
            ],
            "type": "u128"
          },
          {
            "name": "pendingStockYield",
            "docs": [
              "Raw underlying freed while no YT was locked; allocated once YT is locked."
            ],
            "type": "u64"
          },
          {
            "name": "totalStockYield",
            "docs": [
              "Raw underlying allocated to locked YT over the market's lifetime."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "multiplierSynced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "multiplier",
            "type": "u128"
          },
          {
            "name": "freed",
            "docs": [
              "Raw underlying released from backing principal by this sync."
            ],
            "type": "u64"
          },
          {
            "name": "allocated",
            "docs": [
              "Raw underlying moved into the locked-YT index by this sync."
            ],
            "type": "u64"
          },
          {
            "name": "accStockPerYt",
            "type": "u128"
          },
          {
            "name": "pendingStockYield",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "offer",
      "docs": [
        "A fixed-price offer to sell a market's PT or YT for its quote token (the",
        "market's dividend mint, e.g. USDC). The tokens for sale sit in an escrow",
        "owned by the offer PDA until they're bought or the maker cancels."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "The market's PT or YT mint."
            ],
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "id",
            "docs": [
              "Maker-chosen id, so one wallet can list many offers per market."
            ],
            "type": "u64"
          },
          {
            "name": "price",
            "docs": [
              "Quote token base units per whole PT/YT (10^decimals share units)."
            ],
            "type": "u64"
          },
          {
            "name": "amount",
            "docs": [
              "Share units still for sale."
            ],
            "type": "u64"
          },
          {
            "name": "initialAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "offerCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "offer",
            "type": "pubkey"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Share units returned to the maker."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "offerCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "offer",
            "type": "pubkey"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "The market's PT or YT mint."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Share units for sale."
            ],
            "type": "u64"
          },
          {
            "name": "price",
            "docs": [
              "Quote token base units per whole PT/YT."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "offerFilled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "offer",
            "type": "pubkey"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Share units bought."
            ],
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "cost",
            "docs": [
              "Quote token base units paid to the maker."
            ],
            "type": "u64"
          },
          {
            "name": "remaining",
            "docs": [
              "Share units still for sale."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Raw underlying returned."
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "PT and YT burned, in share units."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stockYieldClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Raw underlying paid out."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stripped",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Raw underlying deposited."
            ],
            "type": "u64"
          },
          {
            "name": "shares",
            "docs": [
              "PT and YT minted, in share units."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "yieldClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "yieldPosition",
      "docs": [
        "A user's locked YT in one market and the yield it has earned."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "ytLocked",
            "type": "u64"
          },
          {
            "name": "dividendDebt",
            "docs": [
              "Cash dividends (in token units) already accounted for at the current index."
            ],
            "type": "u128"
          },
          {
            "name": "unclaimed",
            "type": "u64"
          },
          {
            "name": "totalClaimed",
            "type": "u64"
          },
          {
            "name": "stockDebt",
            "docs": [
              "Raw underlying yield already accounted for at the current stock index."
            ],
            "type": "u128"
          },
          {
            "name": "unclaimedStock",
            "type": "u64"
          },
          {
            "name": "totalStockClaimed",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ytLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ytUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "dividendVaultSeed",
      "type": "bytes",
      "value": "[100, 105, 118, 105, 100, 101, 110, 100, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "marketSeed",
      "type": "bytes",
      "value": "[109, 97, 114, 107, 101, 116]"
    },
    {
      "name": "offerEscrowSeed",
      "type": "bytes",
      "value": "[111, 102, 102, 101, 114, 95, 101, 115, 99, 114, 111, 119]"
    },
    {
      "name": "offerSeed",
      "type": "bytes",
      "value": "[111, 102, 102, 101, 114]"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "ptMintSeed",
      "type": "bytes",
      "value": "[112, 116, 95, 109, 105, 110, 116]"
    },
    {
      "name": "underlyingVaultSeed",
      "type": "bytes",
      "value": "[117, 110, 100, 101, 114, 108, 121, 105, 110, 103, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "ytEscrowSeed",
      "type": "bytes",
      "value": "[121, 116, 95, 101, 115, 99, 114, 111, 119]"
    },
    {
      "name": "ytMintSeed",
      "type": "bytes",
      "value": "[121, 116, 95, 109, 105, 110, 116]"
    }
  ]
};
