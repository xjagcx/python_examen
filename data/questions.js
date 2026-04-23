module.exports = [
  {
    id: 1,
    prompt: '1) ¿Qué imprime este código?\n\nprint("Hola, Python")',
    options: ['Hola, Python', '"Hola, Python"', 'Error de sintaxis', 'Nada'],
    correctIndex: 0
  },
  {
    id: 2,
    prompt: '2) ¿Cuál de estas opciones es un nombre de variable válido en Python?',
    options: ['2nombre', 'mi-variable', 'mi_variable', 'class'],
    correctIndex: 2
  },
  {
    id: 3,
    prompt: '3) ¿Qué tipo de dato es el valor 3.14?',
    options: ['int', 'float', 'str', 'bool'],
    correctIndex: 1
  },
  {
    id: 4,
    prompt: '4) ¿Qué imprime este código?\n\nx = 5\nprint(type(x).__name__)',
    options: ['float', 'str', 'int', 'bool'],
    correctIndex: 2
  },
  {
    id: 5,
    prompt: '5) ¿Cómo se escribe un comentario de una sola línea en Python?',
    options: ['// comentario', '<!-- comentario -->', '# comentario', '/* comentario */'],
    correctIndex: 2
  },
  {
    id: 6,
    prompt: '6) ¿Qué operador se usa para elevar 2 a la potencia 3?',
    options: ['2 ^ 3', '2 ** 3', 'pow = 2,3', '2 ^^ 3'],
    correctIndex: 1
  },
  {
    id: 7,
    prompt: '7) ¿Qué valor tendrá resultado?\n\nresultado = 10 % 3',
    options: ['3', '1', '0', '10'],
    correctIndex: 1
  },
  {
    id: 8,
    prompt: '8) ¿Qué imprime este código?\n\nprint("5" + "2")',
    options: ['7', '52', 'Error', '5 2'],
    correctIndex: 1
  },
  {
    id: 9,
    prompt: '9) ¿Qué hace la función input()?',
    options: ['Imprime texto en pantalla', 'Convierte texto a entero automáticamente', 'Pide un dato al usuario y lo devuelve como texto', 'Cierra el programa'],
    correctIndex: 2
  },
  {
    id: 10,
    prompt: '10) ¿Qué imprime este código?\n\nprint(len("python"))',
    options: ['5', '6', '7', 'Error'],
    correctIndex: 1
  },
  {
    id: 11,
    prompt: '11) ¿Cuál es el resultado de esta comparación?\n\n3 > 5',
    options: ['True', 'False', '3', '5'],
    correctIndex: 1
  },
  {
    id: 12,
    prompt: '12) ¿Qué estructura condicional se usa correctamente en Python?',
    options: ['if x > 5 then:', 'if (x > 5)', 'if x > 5:', 'if x > 5 {}'],
    correctIndex: 2
  },
  {
    id: 13,
    prompt: '13) ¿Qué imprime este código?\n\nx = 8\nif x > 5:\n    print("Mayor")\nelse:\n    print("Menor")',
    options: ['Menor', 'Mayor', '8', 'Error'],
    correctIndex: 1
  },
  {
    id: 14,
    prompt: '14) ¿Qué palabra clave se usa para repetir mientras una condición sea verdadera?',
    options: ['for', 'repeat', 'while', 'loop'],
    correctIndex: 2
  },
  {
    id: 15,
    prompt: '15) ¿Qué imprime este código?\n\nfor i in range(3):\n    print(i)',
    options: ['1 2 3', '0 1 2', '0 1 2 3', '3 2 1'],
    correctIndex: 1
  },
  {
    id: 16,
    prompt: '16) ¿Cuántas veces se ejecuta este ciclo?\n\nfor i in range(2, 5):\n    print(i)',
    options: ['2', '3', '4', '5'],
    correctIndex: 1
  },
  {
    id: 17,
    prompt: '17) ¿Qué hace break dentro de un ciclo?',
    options: ['Salta a la siguiente iteración', 'Detiene el ciclo actual', 'Reinicia el ciclo', 'Ignora errores'],
    correctIndex: 1
  },
  {
    id: 18,
    prompt: '18) ¿Qué estructura crea una lista en Python?',
    options: ['{1, 2, 3}', '(1, 2, 3)', '[1, 2, 3]', '<1, 2, 3>'],
    correctIndex: 2
  },
  {
    id: 19,
    prompt: '19) ¿Qué imprime este código?\n\nnums = [10, 20, 30]\nprint(nums[1])',
    options: ['10', '20', '30', 'Error'],
    correctIndex: 1
  },
  {
    id: 20,
    prompt: '20) ¿Qué método agrega un elemento al final de una lista?',
    options: ['add()', 'append()', 'push()', 'insert_end()'],
    correctIndex: 1
  },
  {
    id: 21,
    prompt: '21) ¿Qué imprime este código?\n\nnums = [1, 2, 3]\nnums.append(4)\nprint(len(nums))',
    options: ['3', '4', '5', 'Error'],
    correctIndex: 1
  },
  {
    id: 22,
    prompt: '22) ¿Cuál es el índice del primer elemento de una lista?',
    options: ['0', '1', '-1', 'Depende de la lista'],
    correctIndex: 0
  },
  {
    id: 23,
    prompt: '23) ¿Qué estructura representa un diccionario en Python?',
    options: ['["nombre": "Ana"]', '{"nombre": "Ana"}', '("nombre": "Ana")', '<"nombre": "Ana">'],
    correctIndex: 1
  },
  {
    id: 24,
    prompt: '24) ¿Qué imprime este código?\n\npersona = {"nombre": "Ana", "edad": 20}\nprint(persona["nombre"] )',
    options: ['Ana', 'nombre', '20', 'Error'],
    correctIndex: 0
  },
  {
    id: 25,
    prompt: '25) ¿Qué método devuelve todas las claves de un diccionario?',
    options: ['keys()', 'values()', 'items()', 'getkeys()'],
    correctIndex: 0
  },
  {
    id: 26,
    prompt: '26) ¿Cómo se define una función en Python?',
    options: ['function saludar():', 'def saludar():', 'func saludar():', 'define saludar():'],
    correctIndex: 1
  },
  {
    id: 27,
    prompt: '27) ¿Qué imprime este código?\n\ndef sumar(a, b):\n    return a + b\n\nprint(sumar(2, 3))',
    options: ['23', '5', '2 + 3', 'Error'],
    correctIndex: 1
  },
  {
    id: 28,
    prompt: '28) ¿Para qué sirve return dentro de una función?',
    options: ['Para repetir la función', 'Para mostrar texto solamente', 'Para devolver un valor', 'Para pedir datos al usuario'],
    correctIndex: 2
  },
  {
    id: 29,
    prompt: '29) ¿Qué imprime este código?\n\ndef hola(nombre="mundo"):\n    print("Hola", nombre)\n\nhola()',
    options: ['Hola mundo', 'Hola nombre', 'mundo', 'Error'],
    correctIndex: 0
  },
  {
    id: 30,
    prompt: '30) ¿Qué palabra clave se usa para importar un módulo?',
    options: ['using', 'require', 'include', 'import'],
    correctIndex: 3
  },
  {
    id: 31,
    prompt: '31) ¿Qué imprime este código?\n\nimport math\nprint(math.sqrt(16))',
    options: ['8', '4.0', '16', 'Error'],
    correctIndex: 1
  },
  {
    id: 32,
    prompt: '32) ¿Qué ocurre con este código?\n\ntexto = "123"\nnumero = int(texto)',
    options: ['Da error', 'Convierte el texto a entero', 'Convierte el entero a texto', 'No hace nada'],
    correctIndex: 1
  },
  {
    id: 33,
    prompt: '33) ¿Qué imprime este código?\n\nprint(bool(0))',
    options: ['True', 'False', '0', 'Error'],
    correctIndex: 1
  },
  {
    id: 34,
    prompt: '34) ¿Qué imprime este código?\n\nprint(5 == 5 and 2 < 1)',
    options: ['True', 'False', '5', 'Error'],
    correctIndex: 1
  },
  {
    id: 35,
    prompt: '35) ¿Qué imprime este código?\n\nprint(not True)',
    options: ['True', 'False', 'None', 'Error'],
    correctIndex: 1
  },
  {
    id: 36,
    prompt: '36) ¿Qué imprime este código?\n\nlista = ["a", "b", "c"]\nprint(lista[-1])',
    options: ['a', 'b', 'c', 'Error'],
    correctIndex: 2
  },
  {
    id: 37,
    prompt: '37) ¿Qué imprime este código?\n\nfor letra in "sol":\n    print(letra)',
    options: ['s o l', 'sol', 'Se imprimen las letras una por una', 'Error'],
    correctIndex: 2
  },
  {
    id: 38,
    prompt: '38) ¿Qué hace este código?\n\nedades = [18, 20, 22]\npromedio = sum(edades) / len(edades)',
    options: ['Calcula el promedio de la lista', 'Ordena la lista', 'Cuenta valores repetidos', 'Convierte la lista a texto'],
    correctIndex: 0
  },
  {
    id: 39,
    prompt: '39) ¿Qué imprime este código?\n\nvalor = None\nprint(valor is None)',
    options: ['False', '0', 'True', 'Error'],
    correctIndex: 2
  },
  {
    id: 40,
    prompt: '40) ¿Qué mensaje imprime este código?\n\nnumero = 7\nif numero % 2 == 0:\n    print("par")\nelse:\n    print("impar")',
    options: ['par', 'impar', '7', 'Error'],
    correctIndex: 1
  }
];
